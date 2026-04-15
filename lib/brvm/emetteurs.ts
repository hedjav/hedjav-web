/**
 * Queries Supabase pour le référentiel brvm_emetteurs (migration 027).
 * Clé de voûte de la hiérarchie société → type → documents.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BrvmEmetteur, EmetteurInput } from './types'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Normalise un nom de société pour générer un slug.
 * Ex: "Société Nationale des Télécoms" → "societe-nationale-des-telecoms"
 */
export function slugifyEmetteur(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type UpsertEmetteurResult = {
  status: 'inserted' | 'updated' | 'error'
  id?: string
  error?: string
}

/**
 * Insère ou met à jour un émetteur (idempotent sur le slug).
 * Merge souple : les champs null/undefined en entrée ne remplacent pas la valeur existante.
 */
export async function upsertEmetteur(input: EmetteurInput): Promise<UpsertEmetteurResult> {
  const db = adminClient()

  const { data: existing } = await db
    .from('brvm_emetteurs')
    .select('id, aliases, indices, metadata')
    .eq('slug', input.slug)
    .maybeSingle()

  const payload: Record<string, unknown> = {
    slug: input.slug,
    name: input.name,
    ticker: input.ticker ?? null,
    full_name: input.full_name ?? null,
    isin: input.isin ?? null,
    country: input.country ?? null,
    sector: input.sector ?? null,
    market: input.market ?? null,
    is_active: input.is_active ?? true,
    logo_url: input.logo_url ?? null,
    source_url: input.source_url ?? null,
  }

  if (existing) {
    const mergedAliases = Array.from(
      new Set([...(existing.aliases ?? []), ...(input.aliases ?? [])])
    )
    const mergedIndices = Array.from(
      new Set([...(existing.indices ?? []), ...(input.indices ?? [])])
    )
    const mergedMeta = { ...(existing.metadata ?? {}), ...(input.metadata ?? {}) }

    // Garde la valeur existante si l'input est null/undefined (merge souple)
    for (const k of Object.keys(payload)) {
      if (payload[k] === null || payload[k] === undefined) delete payload[k]
    }
    payload.aliases = mergedAliases
    payload.indices = mergedIndices
    payload.metadata = mergedMeta

    const { error } = await db.from('brvm_emetteurs').update(payload).eq('id', existing.id)
    if (error) return { status: 'error', error: error.message }
    return { status: 'updated', id: existing.id }
  }

  payload.aliases = input.aliases ?? []
  payload.indices = input.indices ?? []
  payload.metadata = input.metadata ?? {}

  const { data, error } = await db
    .from('brvm_emetteurs')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { status: 'error', error: error.message }
  return { status: 'inserted', id: data!.id }
}

export type EmetteurFilters = {
  sector?: string
  market?: 'actions' | 'obligations'
  index?: string
  country?: string
  active_only?: boolean
  search?: string
  limit?: number
  offset?: number
}

export async function listEmetteurs(
  filters: EmetteurFilters = {}
): Promise<{ rows: BrvmEmetteur[]; total: number }> {
  const db = adminClient()
  let query = db
    .from('brvm_emetteurs')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })

  if (filters.active_only !== false) query = query.eq('is_active', true)
  if (filters.sector) query = query.eq('sector', filters.sector)
  if (filters.market) query = query.eq('market', filters.market)
  if (filters.country) query = query.eq('country', filters.country)
  if (filters.index) query = query.contains('indices', [filters.index])
  if (filters.search) {
    const safe = filters.search.replace(/[,()]/g, ' ')
    query = query.or(`name.ilike.%${safe}%,full_name.ilike.%${safe}%,ticker.ilike.%${safe}%`)
  }

  const limit = filters.limit ?? 100
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) {
    console.error('[brvm/emetteurs] listEmetteurs:', error.message)
    return { rows: [], total: 0 }
  }
  return { rows: (data as BrvmEmetteur[]) ?? [], total: count ?? 0 }
}

export async function getEmetteurBySlug(slug: string): Promise<BrvmEmetteur | null> {
  const db = adminClient()
  const { data, error } = await db
    .from('brvm_emetteurs')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error(`[brvm/emetteurs] getEmetteurBySlug(${slug}):`, error.message)
    return null
  }
  return (data as BrvmEmetteur) ?? null
}

/**
 * Résout un émetteur depuis un slug ou un nom, en utilisant aussi la colonne aliases.
 * Utilisé par les scrapers pour rattacher automatiquement les docs.
 */
export async function resolveEmetteur(
  hint: { slug?: string | null; name?: string | null }
): Promise<BrvmEmetteur | null> {
  const db = adminClient()

  if (hint.slug) {
    const { data } = await db
      .from('brvm_emetteurs')
      .select('*')
      .eq('slug', hint.slug)
      .maybeSingle()
    if (data) return data as BrvmEmetteur
  }

  if (hint.name) {
    const cleaned = hint.name.trim()
    const { data: byName } = await db
      .from('brvm_emetteurs')
      .select('*')
      .ilike('name', cleaned)
      .maybeSingle()
    if (byName) return byName as BrvmEmetteur

    // Recherche dans aliases (array contains)
    const { data: byAlias } = await db
      .from('brvm_emetteurs')
      .select('*')
      .contains('aliases', [cleaned])
      .maybeSingle()
    if (byAlias) return byAlias as BrvmEmetteur
  }

  return null
}

/**
 * Distincts pour filtres UI.
 */
export async function getEmetteurFacets(): Promise<{
  sectors: string[]
  indices: string[]
  countries: string[]
}> {
  const db = adminClient()
  const { data } = await db
    .from('brvm_emetteurs')
    .select('sector, indices, country')
    .eq('is_active', true)

  const sectors = new Set<string>()
  const indices = new Set<string>()
  const countries = new Set<string>()
  for (const row of data ?? []) {
    if (row.sector) sectors.add(row.sector)
    if (row.country) countries.add(row.country)
    for (const idx of row.indices ?? []) indices.add(idx)
  }

  return {
    sectors: [...sectors].sort(),
    indices: [...indices].sort(),
    countries: [...countries].sort(),
  }
}
