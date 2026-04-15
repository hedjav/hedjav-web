/**
 * POST /api/brvm/scrape/annonces
 *
 * Boucle sur les 8 sous-catégories d'annonces émetteurs (refonte 4 univers).
 * Remplace l'ancien scrapeAllAnnonces plat.
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 * Query : `?subtype=convocation_ag` pour ne scraper qu'une sous-catégorie.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { scrapeAllAnnonces, scrapeAnnonceSubtype } from '@/lib/brvm/scrapers/annonces'
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
      ? await scrapeAnnonceSubtype(subtype)
      : await scrapeAllAnnonces()

    const ok = 'total_errors' in result ? result.total_errors === 0 : result.errors === 0
    if (source) {
      await markSourceScraped(source.id, {
        success: ok,
        error: ok ? null : 'scrape annonces avec erreurs',
      })
    }
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/brvm/scrape/annonces]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
