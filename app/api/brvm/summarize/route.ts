import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/smtp'
import { brvmDailyEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'
import { logAiCall } from '@/lib/ai/log'

/**
 * POST /api/brvm/summarize
 *
 * Génération du résumé IA à partir des données DÉJÀ scrapées.
 * Appelé APRÈS /api/brvm/scrape (séparé pour pouvoir scraper sans IA).
 *
 * Étapes :
 * 1. Lire les données du jour dans brvm_data
 * 2. Générer un résumé via Claude API
 * 3. Mettre à jour brvm_data.ai_summary
 * 4. Envoyer l'email aux membres (admins) avec résumé + liens documents
 * 5. Notification admin
 *
 * Body optionnel : { date?: "YYYY-MM-DD" } pour résumer un jour passé
 * Cron : tous les jours à 18h30 UTC (30min après le scrape)
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  if (!process.env.INTERNAL_API_TOKEN || auth !== `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: { date?: string } = {}
    try { body = await request.json() } catch { /* body optionnel */ }

    const dataDate = body.date ?? new Date().toISOString().slice(0, 10)

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // ── 1. Lire les données du jour ──────────────────────────
    const { data: dayData } = await db
      .from('brvm_data')
      .select('*')
      .eq('data_date', dataDate)
      .order('data_type')

    if (!dayData || dayData.length === 0) {
      return NextResponse.json({ ok: false, error: `Aucune donnée BRVM pour le ${dataDate}. Lancez /api/brvm/scrape d'abord.` })
    }

    const resumeData = dayData.find((d) => d.data_type === 'resume_seance')
    const coursData = dayData.find((d) => d.data_type === 'cours_actions')
    const indicesData = dayData.find((d) => d.data_type === 'indices')
    const bocData = dayData.find((d) => d.data_type === 'boc_quotidien')
    const annonces = dayData.filter((d) => d.data_type.startsWith('annonce'))

    const resume = resumeData?.raw_data as Record<string, unknown> | null
    const indices = (indicesData?.raw_data as { indices?: { name: string; value: string; variation: string }[] })?.indices ?? []
    const coursCount = (coursData?.raw_data as { actions?: unknown[] })?.actions?.length ?? 0

    // ── 2. Générer le résumé IA ──────────────────────────────
    const startAi = Date.now()

    const indicesTxt = indices.length > 0
      ? indices.map((i) => `- ${i.name}: ${i.value} (${i.variation})`).join('\n')
      : 'Non disponibles'

    const top5 = (resume?.top5 as { ticker: string; variation: string }[]) ?? []
    const flop5 = (resume?.flop5 as { ticker: string; variation: string }[]) ?? []

    const prompt = `Rédige un résumé de la séance BRVM du ${dataDate} (200-400 mots).

## Indices
${indicesTxt}

## Top hausses
${top5.map((t) => `${t.ticker}: ${t.variation}`).join(', ') || 'N/A'}

## Top baisses
${flop5.map((t) => `${t.ticker}: ${t.variation}`).join(', ') || 'N/A'}

## Données clés
- Valeur des transactions: ${resume?.valeur_transactions ?? 'N/A'}
- Capitalisation actions: ${resume?.cap_actions ?? 'N/A'}
- Nombre de titres: ${coursCount}
- Nombre d'annonces: ${annonces.length}
- BOC PDF: ${bocData ? 'Disponible' : 'Non disponible'}

Rédige en français, style professionnel mais accessible, pour des investisseurs UEMOA.`

    const aiResult = await generateText({
      system: 'Tu es un analyste financier spécialisé BRVM. Tu rédiges pour egp.hedjav.com, l\'école de gestion de patrimoine.',
      prompt,
      maxTokens: 1024,
    })

    let aiSummary = 'Résumé non disponible (clé API IA non configurée).'
    if (aiResult.ok) {
      aiSummary = aiResult.text
    }

    // Mettre à jour brvm_data avec le résumé
    if (resumeData) {
      await db.from('brvm_data')
        .update({ ai_summary: aiSummary })
        .eq('id', resumeData.id)
    }

    await logAiCall({
      action: 'brvm_daily_summary',
      prompt: prompt.slice(0, 500),
      result: aiSummary.slice(0, 500),
      model: 'claude-sonnet-4-20250514',
      duration_ms: Date.now() - startAi,
      status: aiResult.ok ? 'success' : 'error',
      error_message: aiResult.ok ? undefined : (aiResult as { error: string }).error,
      created_by: 'brvm-summarize-cron',
    })

    // ── 3. Envoyer email aux membres (admins) ────────────────
    const { data: admins } = await db
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    // Collecter les documents du jour (PDFs)
    const documents = dayData
      .filter((d) => d.file_url)
      .map((d) => ({ name: d.title ?? d.data_type, type: d.data_type, url: d.file_url! }))

    let emailsSent = 0
    if (admins && admins.length > 0) {
      const emailData = brvmDailyEmail({
        date: dataDate,
        aiSummary,
        topHausses: top5.map((t) => ({ ticker: t.ticker, nom: '', variation: String(t.variation) })),
        topBaisses: flop5.map((t) => ({ ticker: t.ticker, nom: '', variation: String(t.variation) })),
        indices: indices.slice(0, 8),
        documents,
      })

      for (const admin of admins) {
        const res = await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })
        if (res.ok) emailsSent++
      }
    }

    // ── 4. Notification admin ────────────────────────────────
    await createNotification(
      'report',
      `Résumé BRVM du ${dataDate} généré`,
      `Résumé IA ${aiResult.ok ? 'généré' : 'non disponible (pas de clé IA)'}. ${documents.length} documents. ${emailsSent} emails envoyés.`,
      { date: dataDate, ai: aiResult.ok, emails: emailsSent, documents: documents.length },
    )

    // Marquer les données comme envoyées
    const sentIds = dayData.map((d) => d.id)
    if (sentIds.length > 0 && emailsSent > 0) {
      await db.from('brvm_data')
        .update({ is_sent_to_members: true, sent_at: new Date().toISOString() })
        .in('id', sentIds)
    }

    return NextResponse.json({
      ok: true,
      date: dataDate,
      ai_summary: aiResult.ok,
      documents: documents.length,
      emails_sent: emailsSent,
    })
  } catch (e) {
    console.error('[brvm-summarize] Erreur:', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Erreur interne' }, { status: 500 })
  }
}
