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
 * POST /api/brvm/scrape?async=1
 *
 * Orchestrateur veille BRVM unifié.
 *
 * Deux modes :
 *  - **Mode synchrone (défaut)** : lance le scrape complet et attend le résultat.
 *    Utilisé par le bouton "Lancer la veille" dans /admin/brvm qui veut voir
 *    le résumé immédiatement. Peut prendre 30-90 secondes.
 *
 *  - **Mode async (`?async=1`)** : retourne `202 Accepted` immédiatement (<100ms)
 *    et continue le scrape en arrière-plan. Indispensable pour les cronjobs
 *    externes comme cron-job.org qui ont un timeout de 30s. Le résultat final
 *    est loggé côté serveur et inséré dans `admin_notifications`.
 *
 * Étapes :
 *  1. Données marché (cours, indices, résumé séance) → brvm_data (sikafinance)
 *  2. Documents BOC                                    → brvm_documents (brvm.org)
 *  3. Rapports sociétés                                → brvm_documents (brvm.org)
 *  4. Annonces émetteurs                               → brvm_documents (brvm.org)
 *  5. Notification admin agrégée
 *
 * On ne télécharge JAMAIS les PDFs ici — on stocke métadonnées + URLs + checksum.
 *
 * Auth : Bearer INTERNAL_API_TOKEN
 */

// Évite que Next.js coupe la route trop tôt en mode synchrone. Ignoré sur
// self-hosted (Hostinger Passenger) mais utile si jamais on déploie ailleurs.
export const maxDuration = 300

export async function POST(request: Request) {
  const unauthorized = checkInternalToken(request)
  if (unauthorized) return unauthorized

  const url = new URL(request.url)
  const isAsync = url.searchParams.get('async') === '1'

  if (isAsync) {
    // Fire-and-forget : on lance le scrape en arrière-plan et on retourne
    // immédiatement. Le process Node.js (Passenger sur Hostinger shared)
    // reste vivant tant que la promesse n'est pas résolue, donc le scrape
    // continue même après la réponse HTTP.
    runFullScrape()
      .then((results) => {
        console.log('[brvm-scrape async] terminé :', JSON.stringify(results))
      })
      .catch((e) => {
        console.error('[brvm-scrape async] fatal :', e)
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

  // Mode synchrone : on attend le résultat et on le retourne
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

/**
 * Exécute le scrape complet (market data + BOC + rapports + annonces) et
 * crée la notification admin de fin. Retourne le résumé des counts.
 *
 * Peut prendre 30 à 120 secondes selon :
 *  - la latence réseau vers brvm.org et sikafinance
 *  - le nombre de nouveaux documents à upsert
 *  - la parallélisation des 3 scrapers documentaires (déjà en Promise.all)
 */
async function runFullScrape(): Promise<Record<string, unknown>> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const dataDate = new Date().toISOString().slice(0, 10)
  const start = Date.now()
  const results: Record<string, unknown> = { date: dataDate }

  // ── 1. Données marché → brvm_data (sikafinance, TLS strict, rapide) ──
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
    console.error('[brvm-scrape] market data error:', e)
    results.market = { error: e instanceof Error ? e.message : 'unknown' }
  }

  // ── 2. 3. 4. Veille documentaire → brvm_documents ──
  const sourceResult = await getSourceBySlugDetailed('brvm-org')
  if (!sourceResult.ok) {
    // On retourne les results avec une erreur (sans throw) pour que
    // le mode async fire-and-forget puisse logger proprement.
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
  const totalNew =
    (bocStats?.new ?? 0) + (rapportStats?.new ?? 0) + (annonceStats?.new ?? 0)

  const duration = Math.round((Date.now() - start) / 1000)
  try {
    await createNotification(
      'report',
      `Veille BRVM ${dataDate} — ${totalNew} nouveauté(s)`,
      `BOC: ${bocStats?.new ?? 0} | Rapports: ${rapportStats?.new ?? 0} | Annonces: ${annonceStats?.new ?? 0}. Durée : ${duration}s.`,
      { date: dataDate, results }
    )
  } catch (e) {
    console.error('[brvm-scrape] notification error:', e)
  }

  results.duration_ms = Date.now() - start
  return results
}
