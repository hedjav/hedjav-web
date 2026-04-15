/**
 * Builder de contexte IA BRVM — refonte 2026-04-15.
 *
 * Lit la nouvelle structure 4 univers (Marché / Rapports / Annonces / Publications),
 * enrichit chaque document avec l'émetteur (secteur + indices) via jointure,
 * agrège les facettes utiles (secteurs actifs, indices chauds, top émetteurs)
 * et renvoie un contexte prêt à être injecté dans un prompt.
 *
 * Aucune IA n'est appelée ici — c'est une fonction pure de préparation.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolvePeriod, type PeriodPreset } from '../periods'
import { getLatestIndexValues, listSnapshots } from '../market'
import type {
  BrvmDocument,
  BrvmEmetteur,
  DocFamily,
} from '../types'
import type {
  BrvmAiContext,
  BrvmAiOptions,
  ContextFacets,
  EnrichedDocument,
} from './types'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function periodDays(from: string | null, to: string | null): number {
  if (!from || !to) return 30
  try {
    const d = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24)
    )
    return Math.max(1, d)
  } catch {
    return 30
  }
}

/**
 * Construit le contexte IA BRVM.
 *
 * Fait 1 requête Supabase principale (documents + jointure émetteurs) + 2 petites
 * requêtes marché (snapshots, indices). Les agrégations sont faites en mémoire.
 */
export async function buildBrvmAiContext(
  options: BrvmAiOptions = {}
): Promise<BrvmAiContext> {
  const db = adminClient()
  const preset = (options.period ?? '7d') as PeriodPreset
  const period = resolvePeriod(
    preset,
    options.period_from ?? null,
    options.period_to ?? null
  )
  const maxPerFamily = options.max_docs_per_family ?? 30

  // 1. Documents de la période, enrichis avec émetteur + source
  let query = db
    .from('brvm_documents')
    .select(
      `id, source_id, doc_type, doc_family, doc_subtype, emetteur_id, doc_date,
       title, description, source_url, pdf_url, issuer_slug, issuer_name, sector,
       market_index, checksum, is_new, is_processed, processed_at, processed_by,
       discovered_at, published_at, metadata, created_at, updated_at,
       brvm_sources!inner(slug, name),
       brvm_emetteurs(slug, name, ticker, sector, indices)`
    )
    .order('doc_date', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .limit(400)

  if (period.from) query = query.gte('discovered_at', `${period.from}T00:00:00.000Z`)
  if (period.to) query = query.lte('discovered_at', `${period.to}T23:59:59.999Z`)
  if (options.focus_emetteur) {
    query = query.eq('brvm_emetteurs.slug', options.focus_emetteur)
  }
  if (options.focus_sector) {
    query = query.or(
      `sector.eq.${options.focus_sector},brvm_emetteurs.sector.eq.${options.focus_sector}`
    )
  }

  const { data: rawDocs, error } = await query
  if (error) {
    console.error('[brvm/ai/context] query error:', error.message)
  }

  // 2. Mapping + enrichissement
  const enriched: EnrichedDocument[] = []
  for (const r of rawDocs ?? []) {
    const record = r as unknown as BrvmDocument & {
      brvm_sources: { slug: string; name: string } | null
      brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
    }
    const source = record.brvm_sources
    const emetteur = record.brvm_emetteurs
    enriched.push({
      ...record,
      source_name: source?.name ?? '',
      source_slug: source?.slug ?? '',
      emetteur: emetteur ?? null,
    })
  }

  // Filtre focus_index (post-fetch car indices est un array sur emetteur)
  const filtered = options.focus_index
    ? enriched.filter((d) =>
        d.emetteur?.indices?.includes(options.focus_index!) || d.market_index === options.focus_index
      )
    : enriched

  // 3. Groupage par famille + cap par famille
  const docs: Partial<Record<DocFamily, EnrichedDocument[]>> = {}
  for (const d of filtered) {
    const f = (d.doc_family ?? 'publication') as DocFamily
    if (!docs[f]) docs[f] = []
    if (docs[f]!.length < maxPerFamily) docs[f]!.push(d)
  }

  // 4. Facettes
  const facets = computeFacets(filtered)

  // 5. Marché (2 requêtes légères)
  const [snapshots, indices] = await Promise.all([
    listSnapshots({ limit: 5 }).catch(() => []),
    getLatestIndexValues().catch(() => []),
  ])

  return {
    period: {
      from: period.from,
      to: period.to,
      label: period.label,
      days: periodDays(period.from, period.to),
    },
    docs,
    market: {
      latest_snapshot: snapshots[0] ?? null,
      latest_indices: indices,
      snapshots_history_count: snapshots.length,
    },
    facets,
    total_docs: filtered.length,
    focus: options.focus_emetteur || options.focus_sector || options.focus_index
      ? {
          emetteur_slug: options.focus_emetteur,
          sector: options.focus_sector,
          index: options.focus_index,
        }
      : undefined,
  }
}

function computeFacets(docs: EnrichedDocument[]): ContextFacets {
  const by_family: Partial<Record<DocFamily, number>> = {}
  const by_subtype: Record<string, number> = {}
  const by_sector: Record<string, number> = {}
  const by_index: Record<string, number> = {}
  const by_emetteur = new Map<string, { slug: string; name: string; count: number }>()

  for (const d of docs) {
    if (d.doc_family) {
      by_family[d.doc_family] = (by_family[d.doc_family] ?? 0) + 1
    }
    if (d.doc_subtype) {
      by_subtype[d.doc_subtype] = (by_subtype[d.doc_subtype] ?? 0) + 1
    }
    const sector = d.emetteur?.sector ?? d.sector
    if (sector) by_sector[sector] = (by_sector[sector] ?? 0) + 1

    const indices = d.emetteur?.indices ?? (d.market_index ? [d.market_index] : [])
    for (const idx of indices) by_index[idx] = (by_index[idx] ?? 0) + 1

    const e = d.emetteur
    if (e?.slug) {
      const existing = by_emetteur.get(e.slug)
      if (existing) existing.count++
      else by_emetteur.set(e.slug, { slug: e.slug, name: e.name, count: 1 })
    }
  }

  const top_emetteurs = [...by_emetteur.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { by_family, by_subtype, by_sector, by_index, top_emetteurs }
}

/**
 * Formate un document pour un prompt (ligne courte, dense).
 * Format : `[Famille/Subtype] 2026-04-15 · Émetteur · Titre (Secteur · Indices)`
 */
export function formatDocLine(d: EnrichedDocument): string {
  const date = d.doc_date ?? d.discovered_at.slice(0, 10)
  const family = d.doc_family ?? '?'
  const subtype = d.doc_subtype ?? d.doc_type ?? '?'
  const emetteur = d.emetteur?.name ?? d.issuer_name ?? null
  const sector = d.emetteur?.sector ?? d.sector ?? null
  const indices = d.emetteur?.indices ?? (d.market_index ? [d.market_index] : [])
  const meta: string[] = []
  if (sector) meta.push(sector)
  if (indices.length) meta.push(indices.join('·'))

  const emetteurSegment = emetteur ? ` · ${emetteur}` : ''
  const metaSegment = meta.length ? ` (${meta.join(' · ')})` : ''
  return `[${family}/${subtype}] ${date}${emetteurSegment} · ${d.title}${metaSegment}`
}

/** Construit un bloc texte "TOP N docs" pour prompt. */
export function formatTopDocs(
  docs: EnrichedDocument[],
  limit: number
): string {
  return docs.slice(0, limit).map((d) => `- ${formatDocLine(d)}`).join('\n')
}

/** Condense les facettes en un paragraphe lisible par l'IA. */
export function formatFacets(facets: ContextFacets): string {
  const parts: string[] = []
  const families = Object.entries(facets.by_family)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  if (families.length)
    parts.push(
      `Répartition par univers : ${families.map(([f, n]) => `${f}=${n}`).join(', ')}`
    )

  const sectors = Object.entries(facets.by_sector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  if (sectors.length)
    parts.push(`Secteurs actifs : ${sectors.map(([s, n]) => `${s} (${n})`).join(', ')}`)

  const indices = Object.entries(facets.by_index)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (indices.length)
    parts.push(`Indices touchés : ${indices.map(([i, n]) => `${i} (${n})`).join(', ')}`)

  if (facets.top_emetteurs.length) {
    parts.push(
      `Émetteurs les plus actifs : ${facets.top_emetteurs
        .slice(0, 5)
        .map((e) => `${e.name} (${e.count})`)
        .join(', ')}`
    )
  }

  return parts.join('\n')
}

/** Format un mini snapshot marché pour inclusion dans un prompt. */
export function formatMarketSnippet(ctx: BrvmAiContext): string {
  if (!ctx.market) return ''
  const lines: string[] = []
  const snap = ctx.market.latest_snapshot
  if (snap) {
    const parts: string[] = [`Séance ${snap.snapshot_date}`]
    if (snap.valeur_transactions_fcfa != null)
      parts.push(
        `valeur transactions = ${snap.valeur_transactions_fcfa.toLocaleString('fr-FR')} FCFA`
      )
    if (snap.capi_actions_fcfa != null)
      parts.push(
        `capi actions = ${snap.capi_actions_fcfa.toLocaleString('fr-FR')} FCFA`
      )
    if (snap.nb_transactions != null)
      parts.push(`${snap.nb_transactions} transactions`)
    lines.push(parts.join(' · '))
  }
  if (ctx.market.latest_indices.length) {
    lines.push(
      `Indices : ${ctx.market.latest_indices
        .map(
          (i) =>
            `${i.index_code} ${i.value.toFixed(2)}${
              i.variation_pct != null ? ` (${i.variation_pct > 0 ? '+' : ''}${i.variation_pct.toFixed(2)} %)` : ''
            }`
        )
        .join(' · ')}`
    )
  }
  return lines.join('\n')
}
