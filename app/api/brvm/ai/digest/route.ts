/**
 * POST /api/brvm/ai/digest
 *
 * Génère un digest IA BRVM (admin_alert / daily / weekly / monthly).
 * Ne déclenche PAS l'envoi email. Pour l'envoi admin email, utiliser
 * /api/brvm/alerts/digest (qui utilise cette même couche en interne).
 *
 * Body :
 *   {
 *     kind: 'admin_alert' | 'daily_digest' | 'weekly_digest' | 'monthly_digest',
 *     period?: 'today' | '7d' | '30d' | '3m' | 'all' | 'custom',
 *     period_from?: 'YYYY-MM-DD',
 *     period_to?: 'YYYY-MM-DD',
 *     focus_emetteur?: string,
 *     focus_sector?: string,
 *     focus_index?: string,
 *   }
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { generateBrvmContent } from '@/lib/brvm/ai'
import type { BrvmAiOptions } from '@/lib/brvm/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type DigestKind =
  | 'admin_alert'
  | 'daily_digest'
  | 'weekly_digest'
  | 'monthly_digest'

const ALLOWED_KINDS: DigestKind[] = [
  'admin_alert',
  'daily_digest',
  'weekly_digest',
  'monthly_digest',
]

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: {
    kind?: string
    period?: BrvmAiOptions['period']
    period_from?: string
    period_to?: string
    focus_emetteur?: string
    focus_sector?: string
    focus_index?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const kind = (ALLOWED_KINDS.includes(body.kind as DigestKind)
    ? body.kind
    : 'daily_digest') as DigestKind

  const result = await generateBrvmContent(kind, {
    period: body.period,
    period_from: body.period_from,
    period_to: body.period_to,
    focus_emetteur: body.focus_emetteur,
    focus_sector: body.focus_sector,
    focus_index: body.focus_index,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : result.skipped ? 503 : 500 })
}
