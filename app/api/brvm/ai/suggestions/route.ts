/**
 * POST /api/brvm/ai/suggestions
 *
 * Produit 5 à 8 idées d'articles (titre, angle, priorité, catégorie, univers)
 * à partir de la veille BRVM courante.
 *
 * Body : { period?, focus_sector?, focus_index? }
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { generateBrvmEditorialSuggestions } from '@/lib/brvm/ai'
import type { BrvmAiOptions } from '@/lib/brvm/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: {
    period?: BrvmAiOptions['period']
    focus_sector?: string
    focus_index?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const result = await generateBrvmEditorialSuggestions({
    period: body.period ?? '7d',
    focus_sector: body.focus_sector,
    focus_index: body.focus_index,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : result.skipped ? 503 : 500 })
}
