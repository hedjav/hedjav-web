import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  scrapeResumeSeance,
  scrapeCoursActions,
  scrapeIndices,
  scrapeBocPdf,
  scrapeAnnonces,
} from '@/lib/brvm/scraper'
import { createNotification } from '@/lib/notifications/queries'

/**
 * POST /api/brvm/scrape
 *
 * Téléchargement BRVM uniquement — PAS d'IA.
 * Scrape les données + télécharge les PDFs → stocke dans Supabase.
 *
 * Étapes :
 * 1. Résumé de séance (données chiffrées)
 * 2. Cours de toutes les actions
 * 3. Indices (généraux + sectoriels)
 * 4. BOC PDF du jour → upload Supabase Storage
 * 5. Annonces émetteurs (avec PDFs si disponibles)
 * 6. Notification admin
 *
 * Cron : tous les jours à 18h UTC
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INTERNAL_API_TOKEN || auth !== `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const today = new Date()
    const dataDate = today.toISOString().slice(0, 10)
    const results: Record<string, unknown> = { date: dataDate, step: 'scrape' }

    // ── 1. Résumé de séance ──────────────────────────────────
    const resume = await scrapeResumeSeance()
    if (resume) {
      await db.from('brvm_data').upsert({
        data_date: dataDate,
        data_type: 'resume_seance',
        title: `Résumé séance BRVM du ${dataDate}`,
        content: JSON.stringify({
          valeur_transactions: resume.valeur_transactions,
          cap_actions: resume.cap_actions,
          cap_obligations: resume.cap_obligations,
          brvm_c: resume.brvm_c,
          brvm_30: resume.brvm_30,
          brvm_pres: resume.brvm_pres,
        }),
        source_url: 'https://www.brvm.org/fr/resume',
        raw_data: resume,
      }, { onConflict: 'data_date,data_type', ignoreDuplicates: true })
      results.resume = true
    }

    // ── 2. Cours des actions ─────────────────────────────────
    const coursActions = await scrapeCoursActions()
    if (coursActions.length > 0) {
      await db.from('brvm_data').upsert({
        data_date: dataDate,
        data_type: 'cours_actions',
        title: `Cours actions BRVM — ${coursActions.length} titres`,
        content: `${coursActions.length} titres scrapés`,
        source_url: 'https://www.brvm.org/fr/cours-actions/0',
        raw_data: { actions: coursActions },
      }, { onConflict: 'data_date,data_type', ignoreDuplicates: true })
      results.cours_actions = coursActions.length
    }

    // ── 3. Indices ───────────────────────────────────────────
    const indices = await scrapeIndices()
    if (indices.length > 0) {
      await db.from('brvm_data').upsert({
        data_date: dataDate,
        data_type: 'indices',
        title: `Indices BRVM — ${indices.length} indices`,
        content: indices.map((i) => `${i.name}: ${i.value} (${i.variation})`).join('\n'),
        source_url: 'https://www.brvm.org/fr/cours-indices/0',
        raw_data: { indices },
      }, { onConflict: 'data_date,data_type', ignoreDuplicates: true })
      results.indices = indices.length
    }

    // ── 4. BOC PDF ───────────────────────────────────────────
    const boc = await scrapeBocPdf(today)
    if (boc) {
      const fileName = `boc/BOC_${dataDate.replace(/-/g, '')}.pdf`
      const { error: uploadErr } = await db.storage
        .from('brvm-documents')
        .upload(fileName, boc.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadErr) {
        const { data: urlData } = db.storage.from('brvm-documents').getPublicUrl(fileName)
        await db.from('brvm_data').insert({
          data_date: dataDate,
          data_type: 'boc_quotidien',
          title: `BOC du ${dataDate}`,
          file_url: urlData.publicUrl,
          source_url: boc.url,
        })
        results.boc = true
      } else {
        console.error('[brvm-scrape] Upload BOC échoué:', uploadErr)
      }
    }

    // ── 5. Annonces émetteurs ────────────────────────────────
    const annonces = await scrapeAnnonces()
    if (annonces.length > 0) {
      for (const a of annonces) {
        // Si l'annonce a un PDF → télécharger et stocker
        let storedPdfUrl = a.pdfUrl
        if (a.pdfUrl && a.pdfUrl.startsWith('http')) {
          try {
            const pdfRes = await fetch(a.pdfUrl)
            if (pdfRes.ok) {
              const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
              const pdfName = `annonces/ANNONCE_${dataDate.replace(/-/g, '')}_${a.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              const { error: pdfUpErr } = await db.storage
                .from('brvm-documents')
                .upload(pdfName, pdfBuffer, { contentType: 'application/pdf', upsert: true })
              if (!pdfUpErr) {
                const { data: pdfUrlData } = db.storage.from('brvm-documents').getPublicUrl(pdfName)
                storedPdfUrl = pdfUrlData.publicUrl
              }
            }
          } catch { /* ignore PDF download failure */ }
        }

        await db.from('brvm_data').insert({
          data_date: dataDate,
          data_type: `annonce_${a.categorie?.toLowerCase().replace(/\s+/g, '_') ?? 'autre'}`,
          title: a.title,
          content: `Émetteur: ${a.emetteur} | Catégorie: ${a.categorie}`,
          file_url: storedPdfUrl,
          source_url: 'https://www.brvm.org/fr/annonces-emetteurs',
          raw_data: a,
        })
      }
      results.annonces = annonces.length
    }

    // ── 6. Notification admin ────────────────────────────────
    const total = (resume ? 1 : 0) + coursActions.length + indices.length + annonces.length + (boc ? 1 : 0)
    await createNotification(
      'report',
      `Scraping BRVM du ${dataDate} terminé`,
      `${total} éléments collectés. ${coursActions.length} titres, ${indices.length} indices, ${annonces.length} annonces.${boc ? ' BOC PDF téléchargé.' : ''} Résumé IA en attente.`,
      { date: dataDate, results },
    )

    return NextResponse.json({ ok: true, ...results })
  } catch (e) {
    console.error('[brvm-scrape] Erreur:', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Erreur interne' }, { status: 500 })
  }
}
