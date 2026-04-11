import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computeChecksum } from './checksum'
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
 *
 * Gestion des conflits de priorité source :
 *   Si un document avec le même checksum existe déjà, on NE met PAS à jour
 *   les champs (sauf cas où la source actuelle est plus prioritaire — non
 *   implémenté en v1, on garde simple : premier arrivé, premier servi).
 */
export async function upsertDocument(input: DocumentInput): Promise<UpsertResult> {
  const db = adminClient()

  const source = await getSourceBySlug(input.source_slug)
  if (!source) {
    return { status: 'error', error: `Source inconnue: ${input.source_slug}` }
  }

  const checksum = computeChecksum(input)

  // Vérification explicite avant insert pour distinguer "skipped" de "error"
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
    // Race condition : un autre worker a inséré entre-temps → traiter comme skipped
    if (error.code === '23505') {
      return { status: 'skipped' }
    }
    return { status: 'error', error: error.message }
  }

  return { status: 'inserted', id: data!.id }
}

/**
 * Marque un document comme traité (workflow admin).
 * Le drapeau is_new passe à false pour sortir de l'onglet "Nouveautés".
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

export type DocumentListFilters = {
  doc_type?: DocType
  source_slug?: string
  is_new?: boolean
  is_processed?: boolean
  issuer_slug?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export type DocumentListRow = BrvmDocument & {
  source_name: string
  source_slug: string
}

/**
 * Liste paginée pour l'admin, avec jointure source pour afficher le nom lisible.
 * Attention : order by discovered_at pour voir les nouveautés en tête.
 */
export async function listDocuments(filters: DocumentListFilters = {}): Promise<{
  rows: DocumentListRow[]
  total: number
}> {
  const db = adminClient()

  let query = db
    .from('brvm_documents')
    .select('*, brvm_sources!inner(slug, name)', { count: 'exact' })
    .order('discovered_at', { ascending: false })

  if (filters.doc_type) query = query.eq('doc_type', filters.doc_type)
  if (filters.is_new !== undefined) query = query.eq('is_new', filters.is_new)
  if (filters.is_processed !== undefined) query = query.eq('is_processed', filters.is_processed)
  if (filters.issuer_slug) query = query.eq('issuer_slug', filters.issuer_slug)
  if (filters.date_from) query = query.gte('doc_date', filters.date_from)
  if (filters.date_to) query = query.lte('doc_date', filters.date_to)
  if (filters.source_slug) query = query.eq('brvm_sources.slug', filters.source_slug)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) {
    console.error('[brvm/documents] listDocuments:', error.message)
    return { rows: [], total: 0 }
  }

  // Aplatir la jointure
  const rows: DocumentListRow[] = (data ?? []).map((r: Record<string, unknown>) => {
    const source = r.brvm_sources as { slug: string; name: string } | null
    return {
      ...(r as unknown as BrvmDocument),
      source_slug: source?.slug ?? '',
      source_name: source?.name ?? '',
    }
  })

  return { rows, total: count ?? 0 }
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
