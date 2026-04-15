/**
 * POST /api/admin/articles/ai/titles
 *
 * Propose 5-8 titres d'article (SEO-friendly) à partir d'un sujet, d'un
 * angle optionnel et/ou de documents BRVM.
 *
 * Body : { subject?, angle?, brvm_document_ids?, instructions?, category? }
 * Auth : session admin.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { generateArticleTitles } from '@/lib/articles/ai'
import { normaliseCategory } from '@/lib/articles/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await checkAdminSession()
  if (auth.response) return auth.response

  let body: {
    subject?: string
    angle?: string
    brvm_document_ids?: string[]
    instructions?: string
    category?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const hasSubject = Boolean(body.subject?.trim())
  const hasDocs = Array.isArray(body.brvm_document_ids) && body.brvm_document_ids.length > 0
  const hasAngle = Boolean(body.angle?.trim())
  if (!hasSubject && !hasDocs && !hasAngle) {
    return NextResponse.json(
      { ok: false, error: 'Fournir au moins un sujet, un angle ou des document_ids BRVM' },
      { status: 400 }
    )
  }

  const result = await generateArticleTitles({
    subject: body.subject,
    angle: body.angle,
    brvm_document_ids: body.brvm_document_ids,
    instructions: body.instructions,
    category: normaliseCategory(body.category ?? null),
  })

  const status = result.ok ? 200 : result.skipped ? 503 : 500
  return NextResponse.json(result, { status })
}
