import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  scrapeResumeSeance,
  scrapeCoursActions,
  scrapeIndices,
  scrapeBocPdf,
  scrapeAnnonces,
} from '@/lib/brvm/scraper'
import { generateText } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/smtp'
import { brvmDailyEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'
import { logAiCall } from '@/lib/ai/log'

/**
 * POST /api/brvm/daily
 *
 * Pipeline complet de veille BRVM quotidienne :
 * 1. Scrape resume seance
 * 2. Scrape cours actions
 * 3. Scrape indices
 * 4. Telecharge BOC PDF → Supabase Storage
 * 5. Scrape annonces
 * 6. Resume IA via Claude
 * 7. Email admins + notification
 *
 * Protege par INTERNAL_API_TOKEN.
 * CRON : tous les jours a 18h (apres cloture BRVM).
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

    const today = new Date()
    const dataDate = today.toISOString().slice(0, 10)
    const results: Record<string, unknown> = { date: dataDate }

    // ── 1. Resume de seance ──────────────────────────────────
    const resume = await scrapeResumeSeance()
    if (resume) {
      await db.from('brvm_data').insert({
        data_date: dataDate,
        data_type: 'resume_seance',
        title: `Resume seance BRVM du ${dataDate}`,
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
      })
      results.resume = true
    }

    // ── 2. Cours des actions ─────────────────────────────────
    const coursActions = await scrapeCoursActions()
    if (coursActions.length > 0) {
      await db.from('brvm_data').insert({
        data_date: dataDate,
        data_type: 'cours_actions',
        title: `Cours actions BRVM — ${coursActions.length} titres`,
        content: `${coursActions.length} titres scrapes`,
        source_url: 'https://www.brvm.org/fr/cours-actions/0',
        raw_data: { actions: coursActions },
      })
      results.cours_actions = coursActions.length
    }

    // ── 3. Indices ───────────────────────────────────────────
    const indices = await scrapeIndices()
    if (indices.length > 0) {
      await db.from('brvm_data').insert({
        data_date: dataDate,
        data_type: 'indices',
        title: `Indices BRVM — ${indices.length} indices`,
        content: indices.map((i) => `${i.name}: ${i.value} (${i.variation})`).join('\n'),
        source_url: 'https://www.brvm.org/fr/cours-indices/0',
        raw_data: { indices },
      })
      results.indices = indices.length
    }

    // ── 4. BOC PDF ───────────────────────────────────────────
    const boc = await scrapeBocPdf(today)
    if (boc) {
      // Upload to Supabase Storage
      const fileName = `BOC_${dataDate.replace(/-/g, '')}.pdf`
      const { error: uploadErr } = await db.storage
        .from('brvm-documents')
        .upload(fileName, boc.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadErr) {
        const { data: urlData } = db.storage
          .from('brvm-documents')
          .getPublicUrl(fileName)

        await db.from('brvm_data').insert({
          data_date: dataDate,
          data_type: 'boc_quotidien',
          title: `BOC du ${dataDate}`,
          file_url: urlData.publicUrl,
          source_url: boc.url,
        })
        results.boc = true
      } else {
        console.error('[brvm-daily] Upload BOC echoue:', uploadErr)
      }
    }

    // ── 5. Annonces ──────────────────────────────────────────
    const annonces = await scrapeAnnonces()
    if (annonces.length > 0) {
      const inserts = annonces.map((a) => ({
        data_date: dataDate,
        data_type: 'annonce',
        title: a.title,
        content: `Emetteur: ${a.emetteur} | Categorie: ${a.categorie}`,
        file_url: a.pdfUrl,
        source_url: 'https://www.brvm.org/fr/annonces-emetteurs',
        raw_data: a,
      }))
      await db.from('brvm_data').insert(inserts)
      results.annonces = annonces.length
    }

    // ── 6. Resume IA ─────────────────────────────────────────
    let aiSummary: string | null = null
    const startAi = Date.now()

    if (resume || indices.length > 0 || coursActions.length > 0) {
      const indicesTxt = indices.length > 0
        ? indices.map((i) => `- ${i.name}: ${i.value} (${i.variation})`).join('\n')
        : 'Non disponibles'

      const topTxt = resume?.top5?.length
        ? resume.top5.map((t) => `${t.ticker}: ${t.variation}`).join(', ')
        : 'N/A'

      const flopTxt = resume?.flop5?.length
        ? resume.flop5.map((t) => `${t.ticker}: ${t.variation}`).join(', ')
        : 'N/A'

      const prompt = `Redige un resume concis (200-400 mots) de la seance BRVM du ${dataDate}.

## Indices
${indicesTxt}

## Top hausses
${topTxt}

## Top baisses
${flopTxt}

## Donnees cles
- Valeur des transactions: ${resume?.valeur_transactions ?? 'N/A'}
- Capitalisation actions: ${resume?.cap_actions ?? 'N/A'}
- Nombre de titres: ${coursActions.length}
- Nombre d'annonces: ${annonces.length}

Redige en francais, style professionnel mais accessible, pour un public UEMOA.
Mets en valeur les tendances et les evenements marquants.`

      const aiResult = await generateText({
        system: 'Tu es un analyste financier specialise BRVM. Tu rediges pour egp.hedjav.com.',
        prompt,
        maxTokens: 1024,
      })

      if (aiResult.ok) {
        aiSummary = aiResult.text

        // Update brvm_data resume_seance with AI summary
        await db.from('brvm_data')
          .update({ ai_summary: aiSummary })
          .eq('data_date', dataDate)
          .eq('data_type', 'resume_seance')

        results.ai_summary = true
      }

      await logAiCall({
        action: 'brvm_daily_summary',
        prompt: prompt.slice(0, 500),
        result: aiSummary?.slice(0, 500) ?? undefined,
        model: 'claude-sonnet-4-20250514',
        duration_ms: Date.now() - startAi,
        status: aiResult.ok ? 'success' : 'error',
        error_message: aiResult.ok ? undefined : aiResult.error,
        created_by: 'brvm-daily-cron',
      })
    }

    // ── 7. Email admins ──────────────────────────────────────
    const { data: admins } = await db
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const emailData = brvmDailyEmail({
        date: dataDate,
        aiSummary: aiSummary ?? 'Resume non disponible.',
        topHausses: resume?.top5 ?? [],
        topBaisses: resume?.flop5 ?? [],
        indices: indices.slice(0, 8),
        documents: [
          ...(boc ? [{ name: `BOC ${dataDate}`, type: 'PDF' }] : []),
          ...annonces.slice(0, 3).map((a) => ({ name: a.title, type: 'Annonce' })),
        ],
      })

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })
      }
      results.emails_sent = admins.length
    }

    // ── 8. Notification admin ────────────────────────────────
    const totalItems = (resume ? 1 : 0) + coursActions.length + indices.length + annonces.length + (boc ? 1 : 0)
    await createNotification(
      'report',
      `Veille BRVM du ${dataDate}`,
      `${totalItems} elements collectes. ${coursActions.length} titres, ${indices.length} indices, ${annonces.length} annonces.${boc ? ' BOC telecharge.' : ''}${aiSummary ? ' Resume IA genere.' : ''}`,
      { date: dataDate, results },
    )

    return NextResponse.json({ ok: true, ...results })
  } catch (e) {
    console.error('[brvm-daily] Erreur inattendue:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
