/**
 * POST /api/brvm/ai/score-batch
 *
 * Scoring en masse : re-note via IA réelle les N derniers documents qui n'ont
 * qu'un score heuristique (`metadata.ai_score.provider === null`). Utile en
 * cron quotidien ou après un gros scrape.
 *
 * Body (optionnel) :
 *   {
 *     limit?: number,           // défaut 10, max 30 (coût IA)
 *     families?: DocFamily[],   // filtre optionnel (ex : ['report','announcement'])
 *     only_new?: boolean,       // ne re-scorer que les docs is_new=true (défaut true)
 *     force?: boolean,          // ignorer le check fallback_used (re-score même si IA déjà passé)
 *   }
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { scoreBrvmDocument } from '@/lib/brvm/ai'
import type { BrvmDocument, BrvmEmetteur, DocFamily } from '@/lib/brvm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_FAMILIES: DocFamily[] = ['market', 'report', 'announcement', 'publication']

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: {
    limit?: number
    families?: DocFamily[]
    only_new?: boolean
    force?: boolean
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const limit = Math.min(Math.max(body.limit ?? 10, 1), 30)
  const onlyNew = body.only_new !== false
  const force = Boolean(body.force)
  const families =
    Array.isArray(body.families) && body.families.length > 0
      ? body.families.filter((f) => VALID_FAMILIES.includes(f))
      : null

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Docs candidats : DESC par discovered_at, optionnellement filtrés par is_new + family
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
    .order('discovered_at', { ascending: false })
    .limit(limit * 4) // surcharge x4 car certains seront filtrés post-fetch

  if (onlyNew) query = query.eq('is_new', true)
  if (families) query = query.in('doc_family', families)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // Post-filter : on ne re-score que les docs sans IA réelle (sauf force)
  const candidates = (data ?? []).filter((r) => {
    if (force) return true
    const meta = (r.metadata ?? {}) as { ai_score?: { provider?: string | null } }
    const provider = meta.ai_score?.provider
    return !provider // pas de provider = heuristique uniquement
  })

  const toScore = candidates.slice(0, limit)
  const results: Array<{
    id: string
    title: string
    before_importance: string | null
    after_importance: string | null
    score_100: number | null
    provider: string | null
    ok: boolean
    error?: string
  }> = []

  for (const r of toScore) {
    const rec = r as unknown as BrvmDocument & {
      brvm_sources: { slug: string; name: string } | null
      brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
    }
    const before =
      ((rec.metadata ?? {}) as { ai_score?: { importance?: string } }).ai_score?.importance ??
      null

    const enriched = {
      ...rec,
      source_name: rec.brvm_sources?.name ?? '',
      source_slug: rec.brvm_sources?.slug ?? '',
      emetteur: rec.brvm_emetteurs,
    }

    const scoreResult = await scoreBrvmDocument(enriched)
    if (!scoreResult.ok || !scoreResult.content) {
      results.push({
        id: rec.id,
        title: rec.title,
        before_importance: before,
        after_importance: null,
        score_100: null,
        provider: null,
        ok: false,
        error: scoreResult.error ?? 'unknown',
      })
      continue
    }

    // Persiste le score
    const nextMeta = {
      ...(rec.metadata ?? {}),
      ai_score: {
        ...scoreResult.content,
        scored_at: new Date().toISOString(),
        provider: scoreResult.provider,
        model: scoreResult.model,
        fallback_used: Boolean(scoreResult.fallback_used),
      },
    }
    await db.from('brvm_documents').update({ metadata: nextMeta }).eq('id', rec.id)

    results.push({
      id: rec.id,
      title: rec.title,
      before_importance: before,
      after_importance: scoreResult.content.importance,
      score_100: scoreResult.content.score_100,
      provider: scoreResult.provider
        ? `${scoreResult.provider}:${scoreResult.model}`
        : null,
      ok: true,
    })
  }

  const ok_count = results.filter((r) => r.ok).length
  const priority_count = results.filter((r) => r.after_importance === 'priority').length

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    scored: ok_count,
    priority_count,
    results,
  })
}
