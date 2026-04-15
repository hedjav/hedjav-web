/**
 * GET /api/brvm/emetteurs
 *
 * Liste paginée des émetteurs BRVM avec filtres.
 * Session admin.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { getEmetteurFacets, listEmetteurs } from '@/lib/brvm/emetteurs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const url = new URL(request.url)
  const sector = url.searchParams.get('sector') ?? undefined
  const rawMarket = url.searchParams.get('market')
  const market: 'actions' | 'obligations' | undefined =
    rawMarket === 'actions' || rawMarket === 'obligations' ? rawMarket : undefined
  const index = url.searchParams.get('index') ?? undefined
  const country = url.searchParams.get('country') ?? undefined
  const search = url.searchParams.get('search') ?? undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0
  const withFacets = url.searchParams.get('facets') === '1'

  const [list, facets] = await Promise.all([
    listEmetteurs({ sector, market, index, country, search, limit, offset }),
    withFacets ? getEmetteurFacets() : Promise.resolve(null),
  ])

  return NextResponse.json({ ...list, facets })
}
