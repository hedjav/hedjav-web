/**
 * Orchestrateur BRVM (refonte 4 univers, 2026-04-15).
 *
 * Partagé entre `/api/brvm/scrape` (sync) et `/api/brvm/scrape/async`
 * (fire-and-forget pour les crons externes).
 *
 * Étapes :
 *  0. Référentiel émetteurs (seed + sync)                 → brvm_emetteurs
 *  1. Données marché (séries temporelles nouvelles)       → brvm_market_* (brvm.org)
 *  1bis. Données marché legacy (sikafinance, fallback)    → brvm_data
 *  2. Publications (BOC + 6 autres sous-catégories)       → brvm_documents (brvm.org)
 *  3. Rapports sociétés cotées (annuel/semestriel/trim +
 *     états financiers + commentaires activité)           → brvm_documents
 *  4. Annonces émetteurs (8 sous-catégories)              → brvm_documents
 *  5. Notification admin agrégée
 *
 * On ne télécharge JAMAIS les PDFs ici — métadonnées + URLs + checksum uniquement.
 */

import { createClient } from '@supabase/supabase-js'
import {
  scrapeResumeSeance,
  scrapeCoursActions as scrapeCoursActionsLegacy,
  scrapeIndices as scrapeIndicesLegacy,
} from '@/lib/brvm/scraper'
import {
  scrapeBocListing,
  scrapeRapportsIndex,
} from '@/lib/brvm/scrapers/brvm-org'
import { scrapeEmetteurs } from '@/lib/brvm/scrapers/emetteurs'
import { scrapeResume } from '@/lib/brvm/scrapers/marche/resume'
import { scrapeCoursActions } from '@/lib/brvm/scrapers/marche/cours-actions'
import { scrapeIndices } from '@/lib/brvm/scrapers/marche/indices'
import { scrapeAllAnnonces } from '@/lib/brvm/scrapers/annonces'
import { scrapeAllPublications } from '@/lib/brvm/scrapers/publications'
import { scrapeRapportsExtensions } from '@/lib/brvm/scrapers/rapports-extensions'
import { upsertDocument } from '@/lib/brvm/documents'
import { getSourceBySlugDetailed, markSourceScraped } from '@/lib/brvm/sources'
import { createNotification } from '@/lib/notifications/queries'
import type { DocumentInput } from '@/lib/brvm/types'

/**
 * Exécute le scrape complet + crée la notification admin de fin.
 * Retourne le résumé des counts. Ne throw jamais : les erreurs sont
 * remontées dans le `results` retourné (pour que le mode async puisse
 * logger proprement sans crasher le process).
 *
 * Peut prendre 30 à 120 secondes selon :
 *  - la latence réseau vers brvm.org et sikafinance
 *  - le nombre de nouveaux documents à upsert
 *  - la parallélisation des 3 scrapers documentaires
 */
export async function runFullScrape(): Promise<Record<string, unknown>> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const dataDate = new Date().toISOString().slice(0, 10)
  const start = Date.now()
  const results: Record<string, unknown> = { date: dataDate }

  // ── 0. Référentiel émetteurs (seed + sync brvm.org) ──
  try {
    const emetteursRes = await scrapeEmetteurs()
    results.emetteurs = {
      source: emetteursRes.source,
      inserted: emetteursRes.inserted,
      updated: emetteursRes.updated,
      errors: emetteursRes.errors,
    }
  } catch (e) {
    console.error('[run-full-scrape] emetteurs error:', e)
    results.emetteurs = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // ── 1. Séries temporelles marché (nouvelles tables brvm_market_*) ──
  try {
    const [resumeNew, coursNew, indicesNew] = await Promise.all([
      scrapeResume().catch((e) => ({ ok: false, source: 'resume', error: String(e) })),
      scrapeCoursActions().catch((e) => ({
        ok: false,
        source: 'cours-actions',
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
    results.market_new = { resume: resumeNew, cours_actions: coursNew, indices: indicesNew }
  } catch (e) {
    console.error('[run-full-scrape] market-new error:', e)
    results.market_new = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // ── 1bis. Données marché legacy → brvm_data (sikafinance fallback) ──
  try {
    const [cours, indices, resume] = await Promise.all([
      scrapeCoursActionsLegacy(),
      scrapeIndicesLegacy(),
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
          content: indices
            .map((i) => `${i.name}: ${i.value} (${i.variation})`)
            .join('\n'),
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

    results.market = {
      cours: cours.length,
      indices: indices.length,
      resume: !!resume,
    }
  } catch (e) {
    console.error('[run-full-scrape] market data error:', e)
    results.market = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // ── 2. 3. 4. Veille documentaire → brvm_documents ──
  const sourceResult = await getSourceBySlugDetailed('brvm-org')
  if (!sourceResult.ok) {
    results.error = sourceResult.error
    results.reason = sourceResult.reason
    results.hint =
      sourceResult.reason === 'table_missing'
        ? 'Tables BRVM absentes en base. Applique supabase/migrations/023_brvm_clean_reset.sql.'
        : sourceResult.reason === 'not_seeded'
          ? 'Tables BRVM présentes mais le seed est vide. Applique supabase/migrations/023_brvm_clean_reset.sql (idempotent).'
          : "Erreur Supabase inconnue. Vérifie SUPABASE_SERVICE_ROLE_KEY et l'URL du projet dans .env.local."
    return results
  }
  const source = sourceResult.source

  async function ingest(docs: DocumentInput[]): Promise<{
    new: number
    skipped: number
    errors: number
  }> {
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
    // Legacy : BOC listing + rapports index (ingère via upsertDocument classique)
    const [bocDocs, rapportDocs] = await Promise.all([
      scrapeBocListing(3),
      scrapeRapportsIndex(),
    ])

    const [bocStats, rapportStats] = await Promise.all([
      ingest(bocDocs),
      ingest(rapportDocs),
    ])

    results.boc = bocStats
    results.rapports_legacy = rapportStats

    // Refonte 4 univers : les 8 annonces, les 7 publications et les 2
    // extensions rapports se font via leur propre scrapeCategory qui ingest
    // en interne (pas besoin d'ingest() supplémentaire ici).
    const [annoncesRes, publicationsRes, rapportsExtRes] = await Promise.all([
      scrapeAllAnnonces(),
      scrapeAllPublications(),
      scrapeRapportsExtensions(),
    ])

    results.annonces = {
      discovered: annoncesRes.total_discovered,
      skipped: annoncesRes.total_skipped,
      errors: annoncesRes.total_errors,
    }
    results.publications = {
      discovered: publicationsRes.total_discovered,
      skipped: publicationsRes.total_skipped,
      errors: publicationsRes.total_errors,
    }
    results.rapports_extensions = {
      discovered: rapportsExtRes.total_discovered,
      skipped: rapportsExtRes.total_skipped,
      errors: rapportsExtRes.total_errors,
    }

    await markSourceScraped(source.id, { success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[run-full-scrape] documents error:', msg)
    results.documents_error = msg
    await markSourceScraped(source.id, { success: false, error: msg })
  }

  // ── 5. Notification admin agrégée (4 univers) ──
  const bocStats = results.boc as { new: number } | undefined
  const rapportLegacy = results.rapports_legacy as { new: number } | undefined
  const rapportExt = results.rapports_extensions as { discovered: number } | undefined
  const annonces = results.annonces as { discovered: number } | undefined
  const publications = results.publications as { discovered: number } | undefined
  const totalNew =
    (bocStats?.new ?? 0) +
    (rapportLegacy?.new ?? 0) +
    (rapportExt?.discovered ?? 0) +
    (annonces?.discovered ?? 0) +
    (publications?.discovered ?? 0)

  const duration = Math.round((Date.now() - start) / 1000)
  try {
    await createNotification(
      'report',
      `Veille BRVM ${dataDate} — ${totalNew} nouveauté(s)`,
      `Rapports: ${(rapportLegacy?.new ?? 0) + (rapportExt?.discovered ?? 0)} | Annonces: ${annonces?.discovered ?? 0} | Publications: ${(publications?.discovered ?? 0) + (bocStats?.new ?? 0)}. Durée : ${duration}s.`,
      { date: dataDate, results }
    )
  } catch (e) {
    console.error('[run-full-scrape] notification error:', e)
  }

  results.duration_ms = Date.now() - start
  return results
}
