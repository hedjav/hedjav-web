import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeRapportsSocietes } from '@/lib/brvm/scraper'
import { createNotification } from '@/lib/notifications/queries'

/**
 * POST /api/brvm/reports-scan
 *
 * Scrape les rapports des societes cotees BRVM.
 * Compare avec les brvm_data existants, telecharge et stocke les nouveaux.
 * Notification admin.
 *
 * Protege par INTERNAL_API_TOKEN.
 * CRON : dimanche 22h.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const today = new Date().toISOString().slice(0, 10)

    // 1. Scrape rapports
    const rapports = await scrapeRapportsSocietes()

    if (rapports.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Aucun rapport trouve sur brvm.org',
      })
    }

    // 2. Recuperer les rapports deja stockes (par titre pour deduplication)
    const { data: existing } = await db
      .from('brvm_data')
      .select('title, source_url')
      .eq('data_type', 'rapport_societe')

    const existingTitles = new Set((existing ?? []).map((e) => e.title))
    const existingUrls = new Set((existing ?? []).map((e) => e.source_url).filter(Boolean))

    // 3. Filtrer les nouveaux
    const newRapports = rapports.filter(
      (r) => !existingTitles.has(r.title) && !(r.pdfUrl && existingUrls.has(r.pdfUrl)),
    )

    if (newRapports.length === 0) {
      return NextResponse.json({
        ok: true,
        total_found: rapports.length,
        new_found: 0,
        reason: 'Aucun nouveau rapport',
      })
    }

    // 4. Telecharger et stocker les nouveaux rapports PDF
    let stored = 0
    let failedDownloads = 0

    for (const rapport of newRapports) {
      let fileUrl: string | null = null

      // Telecharger le PDF si URL disponible
      if (rapport.pdfUrl) {
        try {
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 30_000)
          const pdfRes = await fetch(rapport.pdfUrl, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Hedjav-BRVM-Scraper/2.0' },
          })
          clearTimeout(timer)

          if (pdfRes.ok) {
            const buffer = Buffer.from(await pdfRes.arrayBuffer())
            const safeName = rapport.title
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 80)
            const fileName = `rapports/${today}_${safeName}.pdf`

            const { error: uploadErr } = await db.storage
              .from('brvm-documents')
              .upload(fileName, buffer, {
                contentType: 'application/pdf',
                upsert: true,
              })

            if (!uploadErr) {
              const { data: urlData } = db.storage
                .from('brvm-documents')
                .getPublicUrl(fileName)
              fileUrl = urlData.publicUrl
            } else {
              console.error('[reports-scan] Upload echoue:', uploadErr)
              failedDownloads++
            }
          } else {
            failedDownloads++
          }
        } catch (e) {
          console.error('[reports-scan] Download PDF echoue:', e instanceof Error ? e.message : e)
          failedDownloads++
        }
      }

      // Inserer dans brvm_data
      await db.from('brvm_data').insert({
        data_date: today,
        data_type: 'rapport_societe',
        title: rapport.title,
        content: `Emetteur: ${rapport.emetteur} | Categorie: ${rapport.categorie}`,
        file_url: fileUrl,
        source_url: rapport.pdfUrl,
        raw_data: rapport,
      })
      stored++
    }

    // 5. Notification admin
    await createNotification(
      'report',
      `Scan rapports BRVM : ${stored} nouveaux`,
      `${rapports.length} rapports trouves, ${newRapports.length} nouveaux, ${stored} stockes.${failedDownloads > 0 ? ` ${failedDownloads} telechargements echoues.` : ''}`,
      { date: today, total: rapports.length, new: newRapports.length, stored, failed: failedDownloads },
    )

    return NextResponse.json({
      ok: true,
      total_found: rapports.length,
      new_found: newRapports.length,
      stored,
      failed_downloads: failedDownloads,
    })
  } catch (e) {
    console.error('[reports-scan] Erreur inattendue:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
