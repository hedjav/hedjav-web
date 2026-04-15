/**
 * POST /api/admin/articles/ai/score
 *
 * Note un article existant (0-100) sur 5 critères via la couche IA factorisée.
 * Persiste :
 *   - `articles.quality_score` (nombre)
 *   - `articles.metadata.quality_score` (snapshot avec breakdown + feedback)
 *
 * Body :
 *   { article_id: string } ou { all: true, limit?: number }
 *
 * Auth : session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession } from '@/lib/brvm/auth'
import { scoreArticleWithAi } from '@/lib/articles/ai'
import type { ArticleTraceability } from '@/lib/articles/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function scoreOne(id: string) {
  const db = adminDb()
  const { data: article } = await db
    .from('articles')
    .select('id, title, body, category, metadata')
    .eq('id', id)
    .maybeSingle()

  if (!article) return { id, ok: false as const, error: 'not_found' }

  const res = await scoreArticleWithAi({
    title: article.title as string,
    body: (article.body as string) ?? '',
    category: (article.category as string) ?? null,
  })

  if (!res.ok || !res.content) {
    return { id, ok: false as const, error: res.error ?? 'ai_failed', skipped: res.skipped }
  }

  const existingMeta = (article.metadata ?? {}) as Record<string, unknown> & {
    quality_score?: ArticleTraceability['quality_score']
  }
  const nextMeta = {
    ...existingMeta,
    quality_score: res.content.score_100,
    quality_breakdown: res.content.breakdown,
    quality_feedback: res.content.feedback,
    quality_scored_at: new Date().toISOString(),
    quality_provider: res.provider,
    quality_model: res.model,
    quality_prompt_version: res.prompt_version,
  }

  await db
    .from('articles')
    .update({ quality_score: res.content.score_100, metadata: nextMeta })
    .eq('id', id)

  return { id, ok: true as const, score: res.content.score_100, breakdown: res.content.breakdown, feedback: res.content.feedback }
}

export async function POST(request: Request) {
  const auth = await checkAdminSession()
  if (auth.response) return auth.response

  let body: { article_id?: string; all?: boolean; limit?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (body.all) {
    const limit = Math.min(Math.max(body.limit ?? 20, 1), 50)
    const db = adminDb()
    const { data: ids } = await db
      .from('articles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(limit)

    const results = []
    for (const row of ids ?? []) {
      results.push(await scoreOne(row.id as string))
    }
    return NextResponse.json({ ok: true, scored: results.filter((r) => r.ok).length, results })
  }

  if (!body.article_id) {
    return NextResponse.json({ error: 'article_id ou all requis' }, { status: 400 })
  }

  const r = await scoreOne(body.article_id)
  if (!r.ok) {
    return NextResponse.json(r, { status: r.error === 'not_found' ? 404 : 500 })
  }
  return NextResponse.json(r)
}
