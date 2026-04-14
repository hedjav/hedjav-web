import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computeChecksum } from './checksum'
import { resolvePeriod, type PeriodRange, type PeriodPreset } from './periods'
import { getSourceBySlug } from './sources'
import type { BrvmDocument, DocType, DocumentInput } from './types'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export type UpsertResult = { status: 'inserted' | 'skipped' | 'error'; id?: string; error?: string }

/**
 * Insère un document s'il n'existe pas déjà (dédup par checksum).
 * Retourne 'skipped' si le document existe déjà — pas d'erreur.
 */
export async function upsertDocument(input: DocumentInput): Promise<UpsertResult> {
  const db = adminClient()

  const source = await getSourceBySlug(input.source_slug)
  if (!source) {
    return { status: 'error', error: `Source inconnue: ${input.source_slug}` }
  }

  const checksum = computeChecksum(input)

  const { data: existing } = await db
    .from('brvm_documents')
    .select('id')
    .eq('checksum', checksum)
    .maybeSingle()

  if (existing) {
    return { status: 'skipped', id: existing.id }
  }

  const { data, error } = await db
    .from('brvm_documents')
    .insert({
      source_id: source.id,
      doc_type: input.doc_type,
      doc_date: input.doc_date ?? null,
      title: input.title,
      description: input.description ?? null,
      source_url: input.source_url,
      pdf_url: input.pdf_url ?? null,
      issuer_slug: input.issuer_slug ?? null,
      issuer_name: input.issuer_name ?? null,
      checksum,
      published_at: input.published_at ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { status: 'skipped' }
    }
    return { status: 'error', error: error.message }
  }

  return { status: 'inserted', id: data!.id }
}

/**
 * Marque un document comme traité (workflow admin).
 */
export async function markProcessed(documentId: string, adminUserId: string): Promise<boolean> {
  const db = adminClient()
  const { error } = await db
    .from('brvm_documents')
    .update({
      is_processed: true,
      is_new: false,
      processed_at: new Date().toISOString(),
      processed_by: adminUserId,
    })
    .eq('id', documentId)

  if (error) {
    console.error('[brvm/documents] markProcessed:', error.message)
    return false
  }
  return true
}

export type SortField = 'discovered_desc' | 'doc_date_desc' | 'type_then_date'

export type DocumentListFilters = {
  /** Préréglage de période (tri et filtre basés sur discovered_at). */
  period?: PeriodPreset
  /** Début personnalisé (yyyy-mm-dd). Utilisé si period='custom'. */
  period_from?: string | null
  /** Fin personnalisée (yyyy-mm-dd). Utilisé si period='custom'. */
  period_to?: string | null
  /** Filtre mono-type (legacy). */
  doc_type?: DocType
  /** Filtre multi-types (préféré pour l'UI hub). */
  doc_types?: DocType[]
  source_slug?: string
  is_new?: boolean
  is_processed?: boolean
  issuer_slug?: string
  /** Secteur (stocké dans metadata->>'sector' ou colonne `sector`). */
  sector?: string
  /** Indice boursier (BRVM Composite / BRVM 30 / BRVM Prestige / etc.). */
  market_index?: string
  /** Filtres manuels sur doc_date (bypass period). */
  date_from?: string
  date_to?: string
  search?: string
  sort?: SortField
  limit?: number
  offset?: number
}

export type DocumentListRow = BrvmDocument & {
  source_name: string
  source_slug: string
}

/**
 * Liste paginée pour l'admin + hub de veille.
 *
 * Tri par défaut : discovered_at DESC (toujours décroissant, couvre 100 % des
 * docs même ceux dont doc_date est NULL). Règle produit : plus récent en haut.
 */
export async function listDocuments(filters: DocumentListFilters = {}): Promise<{
  rows: DocumentListRow[]
  total: number
  period: PeriodRange
}> {
  const db = adminClient()

  const period = resolvePeriod(
    filters.period ?? 'all',
    filters.period_from ?? null,
    filters.period_to ?? null,
  )

  const sort: SortField = filters.sort ?? 'discovered_desc'

  let query = db
    .from('brvm_documents')
    .select('*, brvm_sources!inner(slug, name)', { count: 'exact' })

  // Tri — TOUJOURS décroissant, règle produit non négociable.
  if (sort === 'doc_date_desc') {
    // doc_date peut être null → on met nullsLast pour ne pas perdre les docs
    query = query.order('doc_date', { ascending: false, nullsFirst: false })
                 .order('discovered_at', { ascending: false })
  } else if (sort === 'type_then_date') {
    query = query.order('doc_type', { ascending: true })
                 .order('discovered_at', { ascending: false })
  } else {
    query = query.order('discovered_at', { ascending: false })
  }

  // Filtre période (sur discovered_at : tous les docs en ont)
  if (period.from) {
    query = query.gte('discovered_at', `${period.from}T00:00:00.000Z`)
  }
  if (period.to) {
    query = query.lte('discovered_at', `${period.to}T23:59:59.999Z`)
  }

  // Multi-types préféré
  if (filters.doc_types && filters.doc_types.length > 0) {
    query = query.in('doc_type', filters.doc_types)
  } else if (filters.doc_type) {
    query = query.eq('doc_type', filters.doc_type)
  }

  if (filters.is_new !== undefined) query = query.eq('is_new', filters.is_new)
  if (filters.is_processed !== undefined) query = query.eq('is_processed', filters.is_processed)
  if (filters.issuer_slug) query = query.eq('issuer_slug', filters.issuer_slug)

  // Filtres doc_date explicites (cas admin avancé)
  if (filters.date_from) query = query.gte('doc_date', filters.date_from)
  if (filters.date_to) query = query.lte('doc_date', filters.date_to)

  if (filters.source_slug) query = query.eq('brvm_sources.slug', filters.source_slug)

  // Secteur / indice : via metadata (souple, pas besoin de migration pour le v1)
  if (filters.sector) {
    query = query.eq('metadata->>sector', filters.sector)
  }
  if (filters.market_index) {
    query = query.eq('metadata->>market_index', filters.market_index)
  }

  if (filters.search) {
    const safe = filters.search.replace(/[,()]/g, ' ')
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,issuer_name.ilike.%${safe}%`)
  }

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) {
    console.error('[brvm/documents] listDocuments:', error.message)
    return { rows: [], total: 0, period }
  }

  const rows: DocumentListRow[] = (data ?? []).map((r: Record<string, unknown>) => {
    const source = r.brvm_sources as { slug: string; name: string } | null
    return {
      ...(r as unknown as BrvmDocument),
      source_slug: source?.slug ?? '',
      source_name: source?.name ?? '',
    }
  })

  return { rows, total: count ?? 0, period }
}

/**
 * KPIs pour le dashboard BRVM admin.
 */
export async function getDocumentStats(): Promise<{
  total: number
  boc_total: number
  new_today: number
  new_7d: number
  new_boc_today: number
  new_boc_7d: number
  unprocessed: number
}> {
  const db = adminClient()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const d7 = new Date(today.getTime() - 7 * 24 * 3600 * 1000).toISOString()

  const [total, bocTotal, newToday, new7d, newBocToday, newBoc7d, unprocessed] = await Promise.all([
    db.from('brvm_documents').select('*', { count: 'exact', head: true }),
    db.from('brvm_documents').select('*', { count: 'exact', head: true }).eq('doc_type', 'boc'),
    db.from('brvm_documents').select('*', { count: 'exact', head: true }).gte('discovered_at', `${todayStr}T00:00:00Z`),
    db.from('brvm_documents').select('*', { count: 'exact', head: true }).gte('discovered_at', d7),
    db
      .from('brvm_documents')
      .select('*', { count: 'exact', head: true })
      .eq('doc_type', 'boc')
      .gte('discovered_at', `${todayStr}T00:00:00Z`),
    db
      .from('brvm_documents')
      .select('*', { count: 'exact', head: true })
      .eq('doc_type', 'boc')
      .gte('discovered_at', d7),
    db.from('brvm_documents').select('*', { count: 'exact', head: true }).eq('is_processed', false),
  ])

  return {
    total: total.count ?? 0,
    boc_total: bocTotal.count ?? 0,
    new_today: newToday.count ?? 0,
    new_7d: new7d.count ?? 0,
    new_boc_today: newBocToday.count ?? 0,
    new_boc_7d: newBoc7d.count ?? 0,
    unprocessed: unprocessed.count ?? 0,
  }
}

/**
 * Regroupement par type de document sur une période.
 * Utilisé par les digests email admin (journalier/hebdo/mensuel).
 */
export async function listDocumentsGroupedByType(
  period: PeriodRange,
  opts: { limit_per_type?: number } = {},
): Promise<Record<string, DocumentListRow[]>> {
  const { rows } = await listDocuments({
    period: period.preset,
    period_from: period.from,
    period_to: period.to,
    sort: 'discovered_desc',
    limit: 500,
  })

  const perTypeCap = opts.limit_per_type ?? 25
  const groups: Record<string, DocumentListRow[]> = {}
  for (const row of rows) {
    const key = row.doc_type
    if (!groups[key]) groups[key] = []
    if (groups[key].length < perTypeCap) groups[key].push(row)
  }
  return groups
}
