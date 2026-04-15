/**
 * POST /api/admin/articles/ai/draft
 *
 * Génère un brouillon d'article complet et le persiste en base avec
 * `status='draft'` + traçabilité complète dans `articles.metadata`.
 *
 * Deux modes selon ce que l'admin fournit :
 *   1. Rapide   : sujet libre ou documents BRVM → draft direct
 *   2. Itératif : sujet/docs + angle + titre → draft aligné
 *
 * Body :
 *   {
 *     subject?: string,
 *     angle?: string,
 *     title?: string,
 *     category?: string,
 *     brvm_document_ids?: string[],
 *     instructions?: string
 *   }
 *
 * Auth : session admin.
 *
 * Réponse OK : { ok, id, slug, draft, traceability, provider, model, prompt_version }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession } from '@/lib/brvm/auth'
import { generateArticleDraft, buildTraceability } from '@/lib/articles/ai'
import { normaliseCategory } from '@/lib/articles/categories'
import { articleSlug } from '@/lib/articles/slug'
import type { ArticleAiSource } from '@/lib/articles/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const auth = await checkAdminSession()
  if (auth.response) return auth.response

  let body: {
    subject?: string
    angle?: string
    title?: string
    category?: string
    brvm_document_ids?: string[]
    instructions?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const hasSubject = Boolean(body.subject?.trim())
  const hasDocs = Array.isArray(body.brvm_document_ids) && body.brvm_document_ids.length > 0
  if (!hasSubject && !hasDocs && !body.title?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Fournir un sujet, un titre ou au moins un document BRVM' },
      { status: 400 }
    )
  }

  const category = normaliseCategory(body.category ?? null)
  const sourceDocs = hasDocs ? (body.brvm_document_ids ?? []).slice(0, 15) : []
  const sourceType: ArticleAiSource =
    sourceDocs.length === 0
      ? 'ai_subject'
      : hasSubject
      ? 'ai_hybrid'
      : sourceDocs.length === 1
      ? 'ai_brvm_single'
      : 'ai_brvm_batch'

  const result = await generateArticleDraft({
    subject: body.subject,
    angle: body.angle,
    title: body.title,
    category,
    brvm_document_ids: sourceDocs,
    instructions: body.instructions,
  })

  if (!result.ok || !result.content) {
    const status = result.skipped ? 503 : 500
    return NextResponse.json(result, { status })
  }

  const draft = result.content
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const baseSlug = articleSlug(draft.title) || `article-${Date.now()}`
  const { data: existingSlugs } = await db
    .from('articles')
    .select('slug')
    .ilike('slug', `${baseSlug}%`)
  const taken = new Set(
    ((existingSlugs ?? []) as Array<{ slug: string | null }>).map((r) =>
      (r.slug ?? '').toLowerCase(),
    ),
  )
  let slug = baseSlug
  if (taken.has(baseSlug)) {
    let i = 2
    while (taken.has(`${baseSlug}-${i}`)) i++
    slug = `${baseSlug}-${i}`
  }

  const traceability = {
    ...buildTraceability({
      source_type: sourceType,
      response: result,
      source_documents: sourceDocs,
      subject: body.subject,
      angle: body.angle,
      instructions: body.instructions,
    }),
    source_documents_count: sourceDocs.length,
  }

  const { data, error } = await db
    .from('articles')
    .insert({
      title: draft.title,
      slug,
      excerpt: draft.excerpt,
      body: draft.body,
      category: draft.category,
      source: 'ai',
      status: 'draft',
      created_by: `ai:${result.provider ?? 'unknown'}`,
      metadata: traceability,
    })
    .select('id, slug, title')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    slug: data.slug,
    title: data.title,
    draft,
    traceability,
    provider: result.provider,
    model: result.model,
    prompt_version: result.prompt_version,
  })
}

