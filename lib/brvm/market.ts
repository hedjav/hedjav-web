/**
 * Queries séries temporelles marché BRVM (migration 029).
 *
 * 3 tables :
 *   - brvm_market_snapshots : résumé séance (1 ligne/jour/source)
 *   - brvm_market_ticks     : cours actions/obligations (1 ligne/émetteur/jour/market)
 *   - brvm_indices_ticks    : indices (1 ligne/indice/jour)
 *
 * Tous les inserts sont idempotents via unique keys.
 * Règle produit : **tri décroissant partout**, verrouillé dans les getters.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { IndexTick, MarketSnapshot, MarketTick } from './types'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/* ─── Snapshots (résumé séance) ────────────────────────────────────────── */

export type SnapshotInput = {
  snapshot_date: string
  source_id?: string | null
  valeur_transactions_fcfa?: number | null
  capi_actions_fcfa?: number | null
  capi_obligations_fcfa?: number | null
  nb_titres_echanges?: number | null
  nb_transactions?: number | null
  raw?: Record<string, unknown>
}

export async function upsertSnapshot(input: SnapshotInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = adminClient()
  const { data, error } = await db
    .from('brvm_market_snapshots')
    .upsert(
      {
        snapshot_date: input.snapshot_date,
        source_id: input.source_id ?? null,
        valeur_transactions_fcfa: input.valeur_transactions_fcfa ?? null,
        capi_actions_fcfa: input.capi_actions_fcfa ?? null,
        capi_obligations_fcfa: input.capi_obligations_fcfa ?? null,
        nb_titres_echanges: input.nb_titres_echanges ?? null,
        nb_transactions: input.nb_transactions ?? null,
        raw: input.raw ?? {},
      },
      { onConflict: 'snapshot_date,source_id' }
    )
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id }
}

export async function listSnapshots(
  opts: { limit?: number; from?: string; to?: string } = {}
): Promise<MarketSnapshot[]> {
  const db = adminClient()
  let q = db.from('brvm_market_snapshots').select('*').order('snapshot_date', { ascending: false })
  if (opts.from) q = q.gte('snapshot_date', opts.from)
  if (opts.to) q = q.lte('snapshot_date', opts.to)
  q = q.limit(opts.limit ?? 30)
  const { data, error } = await q
  if (error) {
    console.error('[brvm/market] listSnapshots:', error.message)
    return []
  }
  return (data as MarketSnapshot[]) ?? []
}

/* ─── Ticks (cours actions/obligations) ────────────────────────────────── */

export type TickInput = {
  emetteur_id?: string | null
  emetteur_slug?: string | null
  tick_date: string
  market: 'actions' | 'obligations'
  open?: number | null
  high?: number | null
  low?: number | null
  close?: number | null
  previous_close?: number | null
  variation_pct?: number | null
  volume?: number | null
  value_fcfa?: number | null
  raw?: Record<string, unknown>
}

/**
 * Insère ou met à jour un tick (idempotent sur emetteur_id + tick_date + market).
 * Si emetteur_id absent mais slug fourni, tente de résoudre via brvm_emetteurs.
 */
export async function upsertTick(input: TickInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = adminClient()

  let emetteurId = input.emetteur_id ?? null
  if (!emetteurId && input.emetteur_slug) {
    const { data } = await db
      .from('brvm_emetteurs')
      .select('id')
      .eq('slug', input.emetteur_slug)
      .maybeSingle()
    if (data) emetteurId = data.id
  }

  if (!emetteurId) {
    return { ok: false, error: `emetteur introuvable (slug=${input.emetteur_slug ?? 'n/a'})` }
  }

  const { data, error } = await db
    .from('brvm_market_ticks')
    .upsert(
      {
        emetteur_id: emetteurId,
        tick_date: input.tick_date,
        market: input.market,
        open: input.open ?? null,
        high: input.high ?? null,
        low: input.low ?? null,
        close: input.close ?? null,
        previous_close: input.previous_close ?? null,
        variation_pct: input.variation_pct ?? null,
        volume: input.volume ?? null,
        value_fcfa: input.value_fcfa ?? null,
        raw: input.raw ?? {},
      },
      { onConflict: 'emetteur_id,tick_date,market' }
    )
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id }
}

export type TickFilters = {
  market?: 'actions' | 'obligations'
  emetteur_id?: string
  emetteur_slug?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function listTicks(
  filters: TickFilters = {}
): Promise<{ rows: Array<MarketTick & { emetteur_name: string | null; emetteur_slug: string | null }>; total: number }> {
  const db = adminClient()
  let q = db
    .from('brvm_market_ticks')
    .select('*, brvm_emetteurs!inner(name, slug, ticker, sector, indices)', { count: 'exact' })
    .order('tick_date', { ascending: false })

  if (filters.market) q = q.eq('market', filters.market)
  if (filters.emetteur_id) q = q.eq('emetteur_id', filters.emetteur_id)
  if (filters.emetteur_slug) q = q.eq('brvm_emetteurs.slug', filters.emetteur_slug)
  if (filters.from) q = q.gte('tick_date', filters.from)
  if (filters.to) q = q.lte('tick_date', filters.to)

  const limit = filters.limit ?? 100
  const offset = filters.offset ?? 0
  q = q.range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) {
    console.error('[brvm/market] listTicks:', error.message)
    return { rows: [], total: 0 }
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const em = r.brvm_emetteurs as { name: string; slug: string } | null
    return {
      ...(r as unknown as MarketTick),
      emetteur_name: em?.name ?? null,
      emetteur_slug: em?.slug ?? null,
    }
  })

  return { rows, total: count ?? 0 }
}

/* ─── Indices ticks ────────────────────────────────────────────────────── */

export type IndexTickInput = {
  index_code: string
  tick_date: string
  value: number
  variation_pct?: number | null
  ytd_pct?: number | null
  raw?: Record<string, unknown>
}

export async function upsertIndexTick(input: IndexTickInput): Promise<{ ok: boolean; error?: string }> {
  const db = adminClient()
  const { error } = await db.from('brvm_indices_ticks').upsert(
    {
      index_code: input.index_code,
      tick_date: input.tick_date,
      value: input.value,
      variation_pct: input.variation_pct ?? null,
      ytd_pct: input.ytd_pct ?? null,
      raw: input.raw ?? {},
    },
    { onConflict: 'index_code,tick_date' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function listIndexTicks(
  opts: { code?: string; limit?: number; from?: string; to?: string } = {}
): Promise<IndexTick[]> {
  const db = adminClient()
  let q = db.from('brvm_indices_ticks').select('*').order('tick_date', { ascending: false })
  if (opts.code) q = q.eq('index_code', opts.code)
  if (opts.from) q = q.gte('tick_date', opts.from)
  if (opts.to) q = q.lte('tick_date', opts.to)
  q = q.limit(opts.limit ?? 120)
  const { data, error } = await q
  if (error) {
    console.error('[brvm/market] listIndexTicks:', error.message)
    return []
  }
  return (data as IndexTick[]) ?? []
}

/** Dernière valeur connue par indice. */
export async function getLatestIndexValues(): Promise<IndexTick[]> {
  const db = adminClient()
  const { data, error } = await db
    .from('brvm_indices_ticks')
    .select('*')
    .order('tick_date', { ascending: false })
    .limit(50)
  if (error || !data) return []
  const seen = new Set<string>()
  const out: IndexTick[] = []
  for (const row of data as IndexTick[]) {
    if (seen.has(row.index_code)) continue
    seen.add(row.index_code)
    out.push(row)
  }
  return out
}
