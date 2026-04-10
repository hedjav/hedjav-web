import { NextResponse } from 'next/server'

/**
 * POST /api/brvm/daily
 *
 * Orchestrateur : appelle /api/brvm/scrape puis /api/brvm/summarize.
 * Peut être utilisé par le cron pour tout faire en un seul appel.
 *
 * Les deux étapes sont aussi appelables séparément :
 * - /api/brvm/scrape → téléchargement données + PDFs (PAS d'IA)
 * - /api/brvm/summarize → résumé IA + envoi email (UTILISE l'IA)
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INTERNAL_API_TOKEN || auth !== `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`,
  }

  // Étape 1 : Scrape (pas d'IA)
  let scrapeResult: Record<string, unknown> = {}
  try {
    const res = await fetch(`${base}/api/brvm/scrape`, { method: 'POST', headers })
    scrapeResult = await res.json()
  } catch (e) {
    console.error('[brvm-daily] Scrape échoué:', e)
    scrapeResult = { ok: false, error: 'Scrape failed' }
  }

  // Étape 2 : Résumé IA + email (utilise l'IA)
  let summarizeResult: Record<string, unknown> = {}
  try {
    const res = await fetch(`${base}/api/brvm/summarize`, { method: 'POST', headers })
    summarizeResult = await res.json()
  } catch (e) {
    console.error('[brvm-daily] Summarize échoué:', e)
    summarizeResult = { ok: false, error: 'Summarize failed' }
  }

  return NextResponse.json({
    ok: true,
    scrape: scrapeResult,
    summarize: summarizeResult,
  })
}
