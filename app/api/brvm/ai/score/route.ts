/**
 * POST /api/brvm/ai/score
 *
 * Qualifie l'importance d'un document BRVM (noise / useful / important / priority)
 * avec justification + tags + hook éditorial. Fallback heuristique si IA absente.
 *
 * Body : { document_id: string }
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 *
 * Effet de bord : le résultat est stocké dans
 * `brvm_documents.metadata.ai_score` pour éviter de re-scorer et pour filtrer
 * côté UI plus tard.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { scoreBrvmDocument } from '@/lib/brvm/ai'
import type { BrvmDocument, BrvmEmetteur } from '@/lib/brvm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: { document_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!body.document_id) {
    return NextResponse.json(
      { ok: false, error: 'document_id requis' },
      { status: 400 }
    )
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

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
    .eq('id', body.document_id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Document introuvable' },
      { status: 404 }
    )
  }

  const rec = data as unknown as BrvmDocument & {
    brvm_sources: { slug: string; name: string } | null
    brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
  }
  const enriched = {
    ...rec,
    source_name: rec.brvm_sources?.name ?? '',
    source_slug: rec.brvm_sources?.slug ?? '',
    emetteur: rec.brvm_emetteurs,
  }

  const result = await scoreBrvmDocument(enriched)

  // Persiste le score dans metadata.ai_score
  if (result.ok && result.content) {
    const nextMeta = {
      ...(rec.metadata ?? {}),
      ai_score: {
        ...result.content,
        scored_at: new Date().toISOString(),
        provider: result.provider,
        model: result.model,
        fallback_used: Boolean(result.fallback_used),
      },
    }
    await db
      .from('brvm_documents')
      .update({ metadata: nextMeta })
      .eq('id', rec.id)
  }

  return NextResponse.json(result)
}
