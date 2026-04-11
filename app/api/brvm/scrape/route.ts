import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  scrapeResumeSeance,
  scrapeCoursActions,
  scrapeIndices,
} from '@/lib/brvm/scraper'
import {
  scrapeBocListing,
  scrapeRapportsIndex,
  scrapeAllAnnonces,
} from '@/lib/brvm/scrapers/brvm-org'
import { upsertDocument } from '@/lib/brvm/documents'
import { getSourceBySlugDetailed, markSourceScraped } from '@/lib/brvm/sources'
import { checkInternalToken } from '@/lib/brvm/auth'
import { createNotification } from '@/lib/notifications/queries'
import type { DocumentInput } from '@/lib/brvm/types'

/**
 * POST /api/brvm/scrape
 *
 * Orchestrateur veille BRVM unifié. Remplace l'ancienne /api/brvm/daily.
 *
 * Étapes :
 *  1. Données marché (cours, indices, résumé séance) → table brvm_data (sikafinance.com)
 *  2. Documents BOC           → brvm_documents (brvm.org)
 *  3. Rapports sociétés       → brvm_documents (brvm.org)
 *  4. Annonces émetteurs      → brvm_documents (brvm.org)
 *  5. Notification admin agrégée
 *
 * On ne télécharge JAMAIS les PDFs ici — on stocke métadonnées + URLs + checksum.
 *
 * Pour scraper un seul type, utiliser /api/brvm/scrape/{boc,rapports,annonces}.
 * Pour le résumé IA quotidien, appeler /api/brvm/summarize séparément.
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 */
export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const dataDate = new Date().toISOString().slice(0, 10)
  const start = Date.now()
  const results: Record<string, unknown> = { date: dataDate }

  // ── 1. Données marché → brvm_data (comportement historique préservé) ──
  try {
    const [cours, indices, resume] = await Promise.all([
      scrapeCoursActions(),
      scrapeIndices(),
      scrapeResumeSeance(),
    ])

    if (cours.length > 0) {
      await db.from('brvm_data').upsert(
        {
          data_date: dataDate,
          data_type: 'cours_actions',
          title: `Cours actions BRVM — ${cours.length} titres`,
          content: `${cours.length} titres scrapés depuis sikafinance.com`,
          source_url: 'https://www.sikafinance.com/marches/aaz',
          raw_data: { actions: cours },
        },
        { onConflict: 'data_date,data_type', ignoreDuplicates: true }
      )
    }

    if (indices.length > 0) {
      await db.from('brvm_data').upsert(
        {
          data_date: dataDate,
          data_type: 'indices',
          title: `Indices BRVM — ${indices.length} indices`,
          content: indices.map((i) => `${i.name}: ${i.value} (${i.variation})`).join('\n'),
          source_url: 'https://www.sikafinance.com/marches/aaz',
          raw_data: { indices },
        },
        { onConflict: 'data_date,data_type', ignoreDuplicates: true }
      )
    }

    if (resume) {
      await db.from('brvm_data').upsert(
        {
          data_date: dataDate,
          data_type: 'resume_seance',
          title: `Résumé séance BRVM du ${dataDate}`,
          content: JSON.stringify(resume),
          source_url: 'https://www.sikafinance.com/marches/aaz',
          raw_data: resume,
        },
        { onConflict: 'data_date,data_type', ignoreDuplicates: true }
      )
    }

    results.market = { cours: cours.length, indices: indices.length, resume: !!resume }
  } catch (e) {
    console.error('[brvm-scrape] market data error:', e)
    results.market = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // ── 2. 3. 4. Veille documentaire → brvm_documents ──
  const sourceResult = await getSourceBySlugDetailed('brvm-org')
  if (!sourceResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: sourceResult.error,
        reason: sourceResult.reason,
        hint:
          sourceResult.reason === 'table_missing'
            ? 'Tables BRVM absentes en base. Applique supabase/migrations/023_brvm_clean_reset.sql.'
            : sourceResult.reason === 'not_seeded'
              ? 'Tables BRVM présentes mais le seed est vide. Applique supabase/migrations/023_brvm_clean_reset.sql (idempotent).'
              : "Erreur Supabase inconnue. Vérifie SUPABASE_SERVICE_ROLE_KEY et l'URL du projet dans .env.local.",
        results,
      },
      { status: 500 }
    )
  }
  const source = sourceResult.source

  async function ingest(docs: DocumentInput[]): Promise<{ new: number; skipped: number; errors: number }> {
    const stats = { new: 0, skipped: 0, errors: 0 }
    for (const doc of docs) {
      const res = await upsertDocument(doc)
      if (res.status === 'inserted') stats.new++
      else if (res.status === 'skipped') stats.skipped++
      else stats.errors++
    }
    return stats
  }

  try {
    const [bocDocs, rapportDocs, annonceDocs] = await Promise.all([
      scrapeBocListing(3),
      scrapeRapportsIndex(),
      scrapeAllAnnonces(),
    ])

    const [bocStats, rapportStats, annonceStats] = await Promise.all([
      ingest(bocDocs),
      ingest(rapportDocs),
      ingest(annonceDocs),
    ])

    results.boc = bocStats
    results.rapports = rapportStats
    results.annonces = annonceStats

    await markSourceScraped(source.id, { success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[brvm-scrape] documents error:', msg)
    results.documents_error = msg
    await markSourceScraped(source.id, { success: false, error: msg })
  }

  // ── 5. Notification admin agrégée ──
  const bocStats = results.boc as { new: number } | undefined
  const rapportStats = results.rapports as { new: number } | undefined
  const annonceStats = results.annonces as { new: number } | undefined
  const totalNew = (bocStats?.new ?? 0) + (rapportStats?.new ?? 0) + (annonceStats?.new ?? 0)

  const duration = Math.round((Date.now() - start) / 1000)
  await createNotification(
    'report',
    `Veille BRVM ${dataDate} — ${totalNew} nouveauté(s)`,
    `BOC: ${bocStats?.new ?? 0} | Rapports: ${rapportStats?.new ?? 0} | Annonces: ${annonceStats?.new ?? 0}. Durée : ${duration}s.`,
    { date: dataDate, results }
  )

  return NextResponse.json({ ok: true, duration_ms: Date.now() - start, ...results })
}
