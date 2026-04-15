/**
 * POST /api/brvm/scrape/marche
 *
 * Orchestrateur des 4 scrapers "Données de marché" :
 *   1. Résumé de séance
 *   2. Cours actions
 *   3. Cours obligations
 *   4. Indices
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { scrapeResume } from '@/lib/brvm/scrapers/marche/resume'
import { scrapeCoursActions } from '@/lib/brvm/scrapers/marche/cours-actions'
import { scrapeCoursObligations } from '@/lib/brvm/scrapers/marche/cours-obligations'
import { scrapeIndices } from '@/lib/brvm/scrapers/marche/indices'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { markSourceScraped, getSourceBySlug } from '@/lib/brvm/sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  const started = Date.now()
  const source = await getSourceBySlug('brvm-org')

  const [resume, cActions, cObligs, indices] = await Promise.all([
    scrapeResume().catch((e) => ({ ok: false, source: 'resume', error: String(e) })),
    scrapeCoursActions().catch((e) => ({
      ok: false,
      source: 'cours-actions',
      inserted: 0,
      errors: 1,
      error_messages: [String(e)],
    })),
    scrapeCoursObligations().catch((e) => ({
      ok: false,
      source: 'cours-obligations',
      inserted: 0,
      errors: 1,
      error_messages: [String(e)],
    })),
    scrapeIndices().catch((e) => ({
      ok: false,
      source: 'indices',
      inserted: 0,
      errors: 1,
      error_messages: [String(e)],
    })),
  ])

  const overallOk =
    resume.ok === true || ('ok' in cActions && cActions.ok) || indices.ok === true

  if (source) {
    await markSourceScraped(source.id, {
      success: overallOk,
      error: overallOk ? null : 'scrape marché partiellement échoué',
    })
  }

  return NextResponse.json(
    {
      ok: overallOk,
      duration_ms: Date.now() - started,
      results: { resume, cours_actions: cActions, cours_obligations: cObligs, indices },
    },
    { status: 200 }
  )
}
