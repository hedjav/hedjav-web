import { NextResponse } from 'next/server'
import { checkInternalToken } from '@/lib/brvm/auth'
import { runFullScrape } from '@/lib/brvm/run-full-scrape'

/**
 * POST /api/brvm/scrape/async
 *
 * Mode FIRE-AND-FORGET pour les cronjobs externes qui ont des timeouts
 * stricts (cron-job.org free = 30s max).
 *
 * Comportement :
 *  1. Vérifie le Bearer token
 *  2. Lance `runFullScrape()` SANS await (promesse non résolue)
 *  3. Retourne immédiatement 202 Accepted en <100ms
 *  4. Le scrape continue en arrière-plan dans le process Node.js Passenger
 *     (qui reste vivant jusqu'à résolution de la promesse)
 *  5. Le résultat est loggé via console.log + inséré dans admin_notifications
 *     quand le scrape se termine (~60s plus tard)
 *
 * Pourquoi une route dédiée au lieu de `/scrape?async=1` :
 *  - cron-job.org (free tier) refuse certaines URLs avec query params
 *  - Une URL propre sans `?` passe sans friction dans tous les schedulers
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 */
export const maxDuration = 300

export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  // Fire-and-forget : on lance sans await et on retourne immédiatement.
  // Le .then / .catch garantit qu'on log toujours l'issue, jamais un
  // unhandledRejection.
  runFullScrape()
    .then((results) => {
      console.log('[brvm-scrape-async] terminé :', JSON.stringify(results))
    })
    .catch((e) => {
      console.error('[brvm-scrape-async] fatal :', e)
    })

  return NextResponse.json(
    {
      ok: true,
      mode: 'async',
      message:
        'Scrape lancé en arrière-plan. Le résultat sera dans admin_notifications ~60s.',
      started_at: new Date().toISOString(),
    },
    { status: 202 }
  )
}
