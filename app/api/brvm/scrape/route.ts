import { NextResponse } from 'next/server'
import { checkInternalToken } from '@/lib/brvm/auth'
import { runFullScrape } from '@/lib/brvm/run-full-scrape'

/**
 * POST /api/brvm/scrape
 *
 * Mode SYNCHRONE : attend le scrape complet et retourne le rapport.
 * Utilisé par le bouton "Lancer la veille" dans /admin/brvm.
 * Peut prendre 30 à 90 secondes.
 *
 * Pour les cronjobs externes (cron-job.org, etc.) qui timeoutent à 30s,
 * utiliser la route dédiée `/api/brvm/scrape/async` qui retourne
 * immédiatement 202 Accepted et continue en arrière-plan.
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 */
export const maxDuration = 300

export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  try {
    const results = await runFullScrape()
    return NextResponse.json({ ok: true, mode: 'sync', ...results })
  } catch (e) {
    console.error('[brvm-scrape sync] error:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
