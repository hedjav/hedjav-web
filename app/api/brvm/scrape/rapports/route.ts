import { NextResponse } from 'next/server'
import { checkInternalToken } from '@/lib/brvm/auth'
import { scrapeRapportsIndex } from '@/lib/brvm/scrapers/brvm-org'
import { upsertDocument } from '@/lib/brvm/documents'
import { getSourceBySlug, markSourceScraped } from '@/lib/brvm/sources'
import type { ScrapeResult } from '@/lib/brvm/types'

/**
 * POST /api/brvm/scrape/rapports
 *
 * Scrape les rapports (annuels/trimestriels/semestriels) des sociétés cotées
 * depuis brvm.org. Remplace l'ancienne route /api/brvm/reports-scan.
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 * Cron recommandé : hebdomadaire dimanche 22h UTC
 */
export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  const start = Date.now()
  const source = await getSourceBySlug('brvm-org')
  if (!source) {
    return NextResponse.json({ error: 'Source brvm-org introuvable' }, { status: 500 })
  }

  const result: ScrapeResult = {
    source_slug: 'brvm-org',
    doc_type: 'mixed',
    discovered: 0,
    skipped: 0,
    errors: 0,
    duration_ms: 0,
    details: [],
  }

  try {
    const docs = await scrapeRapportsIndex()

    for (const doc of docs) {
      const res = await upsertDocument(doc)
      if (res.status === 'inserted') {
        result.discovered++
        result.details!.push({ title: doc.title, status: 'new' })
      } else if (res.status === 'skipped') {
        result.skipped++
      } else {
        result.errors++
        result.details!.push({ title: doc.title, status: 'error', error: res.error })
      }
    }

    await markSourceScraped(source.id, { success: true })
    result.duration_ms = Date.now() - start
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await markSourceScraped(source.id, { success: false, error: msg })
    result.duration_ms = Date.now() - start
    return NextResponse.json({ ok: false, error: msg, result }, { status: 500 })
  }
}
