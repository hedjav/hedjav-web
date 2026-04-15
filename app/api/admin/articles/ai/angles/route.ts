/**
 * POST /api/admin/articles/ai/angles
 *
 * Propose 5-8 angles éditoriaux à partir d'un sujet libre et/ou de
 * documents BRVM fournis. Aucun des deux n'est obligatoire (mais au moins
 * l'un des deux doit être non vide).
 *
 * Body :
 *   {
 *     subject?: string,
 *     brvm_document_ids?: string[],
 *     instructions?: string,
 *     category?: string
 *   }
 *
 * Auth : session admin.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { generateArticleAngles } from '@/lib/articles/ai'
import { normaliseCategory } from '@/lib/articles/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await checkAdminSession()
  if (auth.response) return auth.response

  let body: {
    subject?: string
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
  if (!hasSubject && !hasDocs) {
    return NextResponse.json(
      { ok: false, error: 'Fournir au moins un sujet ou des document_ids BRVM' },
      { status: 400 }
    )
  }

  const result = await generateArticleAngles({
    subject: body.subject,
    brvm_document_ids: body.brvm_document_ids,
    instructions: body.instructions,
    category: normaliseCategory(body.category ?? null),
  })

  const status = result.ok ? 200 : result.skipped ? 503 : 500
  return NextResponse.json(result, { status })
}
