/**
 * GET /api/brvm/marche/snapshots
 * Session admin. Série temp résumé séance.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { listSnapshots } from '@/lib/brvm/market'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10) || 30, 365)
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined

  const rows = await listSnapshots({ limit, from, to })
  return NextResponse.json({ rows })
}
