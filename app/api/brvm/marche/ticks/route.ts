/**
 * GET /api/brvm/marche/ticks
 * Session admin. Cours quotidiens (actions / obligations).
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { listTicks } from '@/lib/brvm/market'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const url = new URL(request.url)
  const rawMarket = url.searchParams.get('market')
  const market: 'actions' | 'obligations' | undefined =
    rawMarket === 'actions' || rawMarket === 'obligations' ? rawMarket : undefined
  const emetteur_slug = url.searchParams.get('emetteur') ?? undefined
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0

  const result = await listTicks({ market, emetteur_slug, from, to, limit, offset })
  return NextResponse.json(result)
}
