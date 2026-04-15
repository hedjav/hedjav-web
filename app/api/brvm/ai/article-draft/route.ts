/**
 * POST /api/brvm/ai/article-draft
 *
 * Génère un brouillon d'article JSON ({title, excerpt, category, body})
 * à partir de la veille BRVM courante, avec focus optionnel :
 *   - sur un émetteur
 *   - sur un secteur
 *   - sur des documents précis (document_ids[])
 *   - sur un sujet libre (topic)
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { generateBrvmArticleDraft } from '@/lib/brvm/ai'
import type { BrvmAiOptions } from '@/lib/brvm/ai/types'
import type { BrvmEmetteur, BrvmDocument } from '@/lib/brvm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: {
    period?: BrvmAiOptions['period']
    period_from?: string
    period_to?: string
    focus_emetteur?: string
    focus_sector?: string
    focus_index?: string
    topic?: string
    preferred_category?: string
    document_ids?: string[]
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  // Si document_ids fournis, on les charge pour les passer en focus_docs
  let focusDocs = undefined
  if (body.document_ids && body.document_ids.length > 0) {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await db
      .from('brvm_documents')
      .select(
        `id, source_id, doc_type, doc_family, doc_subtype, emetteur_id, doc_date,
         title, description, source_url, pdf_url, issuer_slug, issuer_name, sector,
         market_index, checksum, is_new, is_processed, processed_at, processed_by,
         discovered_at, published_at, metadata, created_at, updated_at,
         brvm_sources!inner(slug, name),
         brvm_emetteurs(slug, name, ticker, sector, indices)`
      )
      .in('id', body.document_ids.slice(0, 10))
      .limit(10)
    focusDocs = (data ?? []).map((r) => {
      const rec = r as unknown as BrvmDocument & {
        brvm_sources: { slug: string; name: string } | null
        brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
      }
      return {
        ...rec,
        source_name: rec.brvm_sources?.name ?? '',
        source_slug: rec.brvm_sources?.slug ?? '',
        emetteur: rec.brvm_emetteurs,
      }
    })
  }

  const result = await generateBrvmArticleDraft({
    period: body.period ?? '7d',
    period_from: body.period_from,
    period_to: body.period_to,
    focus_emetteur: body.focus_emetteur,
    focus_sector: body.focus_sector,
    focus_index: body.focus_index,
    focus: {
      topic: body.topic,
      preferred_category: body.preferred_category,
      focus_docs: focusDocs,
    },
  })

  return NextResponse.json(result, { status: result.ok ? 200 : result.skipped ? 503 : 500 })
}
