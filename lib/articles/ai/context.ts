/**
 * Builder de contexte pour la couche IA articles.
 *
 * Deux sources possibles (mutuellement compatibles — les deux peuvent
 * être fournies, la couche IA les utilisera toutes les deux) :
 *   - `subject` : sujet libre tapé par l'admin.
 *   - `brvm_document_ids` : le contenu se construit autour de ces documents
 *     BRVM, enrichis via la couche BRVM existante (émetteur, secteur, indices).
 *
 * Rien n'est obligatoire : l'IA peut aussi partir d'un sujet pur ou de
 * documents seuls. C'est volontaire (cf. brief validation Hermann).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { formatDocLine } from '@/lib/brvm/ai/context'
import type { BrvmDocument, BrvmEmetteur } from '@/lib/brvm/types'
import type { EnrichedDocument } from '@/lib/brvm/ai/types'
import type { ArticleCategory } from '../categories'

export type ArticleContextInput = {
  subject?: string
  category?: ArticleCategory | null
  instructions?: string
  brvm_document_ids?: string[]
}

export type ArticleContext = {
  subject: string | null
  category: ArticleCategory | null
  instructions: string | null
  brvm_documents: EnrichedDocument[]
  brvm_summary: string | null
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function buildArticleContext(input: ArticleContextInput): Promise<ArticleContext> {
  const ids = (input.brvm_document_ids ?? []).filter(Boolean).slice(0, 15)
  const docs = ids.length > 0 ? await fetchBrvmDocuments(ids) : []

  return {
    subject: input.subject?.trim() || null,
    category: input.category ?? null,
    instructions: input.instructions?.trim() || null,
    brvm_documents: docs,
    brvm_summary: docs.length > 0 ? formatBrvmSummary(docs) : null,
  }
}

async function fetchBrvmDocuments(ids: string[]): Promise<EnrichedDocument[]> {
  const db = adminClient()
  const { data, error } = await db
    .from('brvm_documents')
    .select(
      `id, source_id, doc_type, doc_family, doc_subtype, emetteur_id, doc_date,
       title, description, source_url, pdf_url, issuer_slug, issuer_name, sector,
       market_index, checksum, is_new, is_processed, processed_at, processed_by,
       discovered_at, published_at, metadata, created_at, updated_at,
       brvm_sources!inner(slug, name),
       brvm_emetteurs(slug, name, ticker, sector, indices)`
    )
    .in('id', ids)

  if (error) {
    console.error('[articles/ai/context] brvm fetch error:', error.message)
    return []
  }

  return (data ?? []).map((r) => {
    const rec = r as unknown as BrvmDocument & {
      brvm_sources: { slug: string; name: string } | null
      brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
    }
    return {
      ...rec,
      source_name: rec.brvm_sources?.name ?? '',
      source_slug: rec.brvm_sources?.slug ?? '',
      emetteur: rec.brvm_emetteurs ?? null,
    }
  })
}

function formatBrvmSummary(docs: EnrichedDocument[]): string {
  const lines = docs.map((d) => `- ${formatDocLine(d)}`)
  const header = docs.length === 1
    ? `Document BRVM de référence :`
    : `${docs.length} documents BRVM de référence (l'article doit les exploiter sans en paraphraser les titres) :`
  return `${header}\n${lines.join('\n')}`
}
