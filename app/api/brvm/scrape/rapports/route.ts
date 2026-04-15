/**
 * POST /api/brvm/scrape/rapports
 *
 * Scrape les rapports sociétés cotées :
 *   - Legacy : rapports annuels / semestriels / trimestriels depuis l'index (brvm-org.ts)
 *   - Extensions : états financiers et commentaires d'activité (_category.ts)
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 * Cron recommandé : hebdomadaire dimanche 22h UTC.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { scrapeRapportsIndex } from '@/lib/brvm/scrapers/brvm-org'
import { scrapeRapportsExtensions } from '@/lib/brvm/scrapers/rapports-extensions'
import { upsertDocument } from '@/lib/brvm/documents'
import { getSourceBySlugDetailed, markSourceScraped } from '@/lib/brvm/sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  const start = Date.now()
  const sourceResult = await getSourceBySlugDetailed('brvm-org')
  if (!sourceResult.ok) {
    return NextResponse.json(
      { ok: false, error: sourceResult.error, reason: sourceResult.reason },
      { status: 500 }
    )
  }
  const source = sourceResult.source

  try {
    // 1. Legacy : rapports annuels/trim/sem depuis index
    const legacyDocs = await scrapeRapportsIndex()
    let legacyDiscovered = 0
    let legacySkipped = 0
    let legacyErrors = 0
    for (const doc of legacyDocs) {
      // Enforce doc_family report pour ces docs
      doc.doc_family = 'report'
      doc.doc_subtype = doc.doc_type
      const res = await upsertDocument(doc)
      if (res.status === 'inserted') legacyDiscovered++
      else if (res.status === 'skipped') legacySkipped++
      else legacyErrors++
    }

    // 2. Extensions : états financiers + commentaires d'activité
    const extensions = await scrapeRapportsExtensions()

    await markSourceScraped(source.id, {
      success: legacyErrors === 0 && extensions.total_errors === 0,
    })

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - start,
      legacy: {
        discovered: legacyDiscovered,
        skipped: legacySkipped,
        errors: legacyErrors,
        total: legacyDocs.length,
      },
      extensions,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await markSourceScraped(source.id, { success: false, error: msg })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
