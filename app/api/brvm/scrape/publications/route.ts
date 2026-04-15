/**
 * POST /api/brvm/scrape/publications
 *
 * Boucle sur les 7 sous-catégories de publications BRVM.
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 *
 * Query: `?subtype=boc` pour ne scraper qu'une sous-catégorie.
 */

import { NextResponse } from 'next/server'
import { scrapeAllPublications, scrapePublicationSubtype } from '@/lib/brvm/scrapers/publications'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { getSourceBySlug, markSourceScraped } from '@/lib/brvm/sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  const url = new URL(request.url)
  const subtype = url.searchParams.get('subtype')

  try {
    const source = await getSourceBySlug('brvm-org')
    const result = subtype
      ? await scrapePublicationSubtype(subtype)
      : await scrapeAllPublications()

    const ok = 'total_errors' in result ? result.total_errors === 0 : result.errors === 0
    if (source) {
      await markSourceScraped(source.id, {
        success: ok,
        error: ok ? null : 'scrape publications avec erreurs',
      })
    }
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/brvm/scrape/publications]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
