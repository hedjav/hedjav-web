import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/smtp'
import { newsletterWeeklyEmail } from '@/lib/email/templates'

/**
 * POST /api/brvm/weekly-digest
 *
 * Récupère les articles BRVM de la semaine, génère un résumé hebdo,
 * et l'envoie aux abonnés newsletter.
 * Protégé par INTERNAL_API_TOKEN.
 * CRON recommandé : vendredi 19h.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { dry_run?: boolean } = {}
  try {
    body = (await request.json()) ?? {}
  } catch {
    /* body optionnel */
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    // Récupérer les articles BRVM de la semaine
    const { data: articles, error: articlesError } = await admin
      .from('articles')
      .select('title, slug, excerpt, body, published_at')
      .eq('category', 'BRVM')
      .eq('source', 'ai')
      .eq('is_published', true)
      .gte('published_at', sevenDaysAgo)
      .order('published_at', { ascending: false })

    if (articlesError) {
      console.error('[brvm-weekly] Erreur récupération articles:', articlesError)
      return NextResponse.json({ ok: false, error: articlesError.message }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Aucun article BRVM cette semaine',
      })
    }

    // Récupérer les abonnés
    const { data: subscribers } = await admin
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true)

    const subsCount = subscribers?.length ?? 0

    if (subsCount === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Aucun abonné actif',
        articles_count: articles.length,
      })
    }

    // Générer le résumé hebdo via Claude (ou fallback)
    const summaryResult = await generateText({
      system: 'Tu rédiges le résumé hebdomadaire BRVM pour la newsletter egp.hedjav.com. Style concis, professionnel, en français.',
      prompt: `Voici les ${articles.length} articles BRVM publiés cette semaine :\n\n${articles.map((a) => `### ${a.title}\n${a.excerpt ?? ''}\n`).join('\n')}\n\nRédige un résumé hebdomadaire de 150-300 mots avec les tendances clés de la semaine, les points forts et les perspectives. En français, pour un public UEMOA.`,
      maxTokens: 1024,
    })

    const digestExcerpt = summaryResult.ok
      ? summaryResult.text
      : articles.map((a) => `- ${a.title}`).join('\n')

    // Construire le template email avec les articles de la semaine
    const tpl = newsletterWeeklyEmail(
      articles.map((a) => ({ title: a.title, slug: a.slug, excerpt: digestExcerpt })),
      [],
    )

    if (body.dry_run) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        subscribers: subsCount,
        articles_count: articles.length,
        subject: tpl.subject,
        digest_preview: digestExcerpt.slice(0, 300),
      })
    }

    // Envoyer aux abonnés
    let sent = 0
    let failed = 0
    for (const sub of subscribers ?? []) {
      const res = await sendEmail({
        to: sub.email as string,
        subject: `[BRVM Hebdo] ${tpl.subject}`,
        html: tpl.html,
      })
      if (res.ok) sent++
      else failed++
    }

    return NextResponse.json({
      ok: true,
      subscribers: subsCount,
      sent,
      failed,
      articles_count: articles.length,
    })
  } catch (e) {
    console.error('[brvm-weekly] Erreur inattendue:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
