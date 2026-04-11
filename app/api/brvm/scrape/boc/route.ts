import { NextResponse } from 'next/server'
import { checkInternalToken } from '@/lib/brvm/auth'
import { scrapeBocListing } from '@/lib/brvm/scrapers/brvm-org'
import { upsertDocument } from '@/lib/brvm/documents'
import { getSourceBySlugDetailed, markSourceScraped } from '@/lib/brvm/sources'
import type { ScrapeResult } from '@/lib/brvm/types'

/**
 * POST /api/brvm/scrape/boc
 *
 * Scrape la page BOC de brvm.org, déduplique par checksum, insert dans brvm_documents.
 * Ne télécharge PAS les PDFs — on stocke juste titre + date + pdf_url + checksum.
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 * Cron recommandé : quotidien 18h UTC (voir docs/CRON_SETUP.md)
 */
export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  const start = Date.now()
  const sourceResult = await getSourceBySlugDetailed('brvm-org')
  if (!sourceResult.ok) {
    return NextResponse.json(
      { ok: false, error: sourceResult.error, reason: sourceResult.reason },
      { status: 500 }
    )
  }
  const source = sourceResult.source

  const result: ScrapeResult = {
    source_slug: 'brvm-org',
    doc_type: 'boc',
    discovered: 0,
    skipped: 0,
    errors: 0,
    duration_ms: 0,
    details: [],
  }

  try {
    const docs = await scrapeBocListing(3) // 3 pages max

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
