/**
 * GET /api/brvm/marche/indices
 * Session admin. Indices BRVM série temporelle + latest par indice.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { getLatestIndexValues, listIndexTicks } from '@/lib/brvm/market'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? undefined
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '120', 10) || 120, 730)
  const latestOnly = url.searchParams.get('latest') === '1'

  if (latestOnly) {
    const rows = await getLatestIndexValues()
    return NextResponse.json({ rows })
  }

  const rows = await listIndexTicks({ code, from, to, limit })
  return NextResponse.json({ rows })
}
