import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/claude/client'
import { sendEmail } from '@/lib/email/sender'
import { newsletterEmail } from '@/lib/email/templates'

/**
 * POST /api/newsletter/send
 *
 * Génère le contenu d'une newsletter hebdomadaire via Claude API à partir
 * des derniers articles publiés et nouveaux ebooks, puis l'envoie à tous les
 * abonnés actifs (table newsletter_subscribers).
 *
 * Header : Authorization: Bearer ${INTERNAL_API_TOKEN}
 *
 * Body (optionnel) :
 *   { dry_run?: boolean, since_days?: number, override_subject?: string }
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { dry_run?: boolean; since_days?: number; override_subject?: string } = {}
  try {
    body = (await request.json()) ?? {}
  } catch {
    /* body optionnel */
  }

  const since = new Date(
    Date.now() - (body.since_days ?? 7) * 24 * 3600 * 1000,
  ).toISOString()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Récupère les nouveautés
  const [{ data: articles }, { data: ebooks }, { data: subscribers }] = await Promise.all([
    admin
      .from('articles')
      .select('title, slug, excerpt, category, published_at')
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .gt('published_at', since)
      .order('published_at', { ascending: false }),
    admin
      .from('ebooks')
      .select('title, slug, short_description, created_at')
      .eq('is_published', true)
      .gt('created_at', since)
      .order('created_at', { ascending: false }),
    admin
      .from('newsletter_subscribers')
      .select('email')
      .eq('is_active', true),
  ])

  const articlesCount = articles?.length ?? 0
  const ebooksCount = ebooks?.length ?? 0
  const subsCount = subscribers?.length ?? 0

  if (articlesCount === 0 && ebooksCount === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Aucune nouveauté à envoyer',
      subscribers: subsCount,
    })
  }

  // Construction du prompt Claude
  const articlesList = (articles ?? [])
    .map((a) => `- [${a.category}] ${a.title} : ${a.excerpt}`)
    .join('\n')
  const ebooksList = (ebooks ?? [])
    .map((e) => `- ${e.title} : ${e.short_description}`)
    .join('\n')

  const prompt = `Tu rédiges la newsletter hebdomadaire de Hedjav, l'école en ligne de la gestion de patrimoine pour la zone UEMOA. Le ton est professionnel mais chaleureux, en français, sans jargon inutile.

Voici les nouveautés de la semaine à présenter :

${articlesCount > 0 ? `## ARTICLES PUBLIÉS (${articlesCount})\n${articlesList}` : ''}

${ebooksCount > 0 ? `## NOUVEAUX EBOOKS (${ebooksCount})\n${ebooksList}` : ''}

Rédige le corps de la newsletter en HTML simple (h2, p, ul, a) avec :
1. Une intro de 2-3 phrases
2. Une section "Articles à lire" si applicable, avec 1-2 phrases d'accroche par article
3. Une section "Nouveaux ebooks" si applicable
4. Une conclusion CTA invitant à visiter https://hedjav.com

Pas de balise <html>, <body>, <head> — uniquement le contenu interne. Pas de styles inline, juste du HTML structurel propre.`

  const generated = await generateText({
    prompt,
    system: 'Tu es le rédacteur en chef de la newsletter Hedjav. Tu écris en français pour un public africain francophone (zone UEMOA).',
    maxTokens: 2000,
  })

  if (!generated.ok) {
    return NextResponse.json({ error: generated.error }, { status: 502 })
  }

  const subject =
    body.override_subject ??
    `Hedjav — ${articlesCount} article${articlesCount > 1 ? 's' : ''}, ${ebooksCount} ebook${ebooksCount > 1 ? 's' : ''} cette semaine`

  const tpl = newsletterEmail({ subject, innerHtml: generated.text })
  const fullHtml = tpl.html

  // Dry run : ne pas envoyer
  if (body.dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      subscribers: subsCount,
      articles: articlesCount,
      ebooks: ebooksCount,
      subject,
      preview: generated.text.slice(0, 500),
    })
  }

  // Envoi à tous les abonnés (séquentiel pour rester simple)
  let sent = 0
  let failed = 0
  for (const sub of subscribers ?? []) {
    const res = await sendEmail({
      to: sub.email as string,
      subject,
      html: fullHtml,
    })
    if (res.ok) sent++
    else failed++
  }

  return NextResponse.json({
    ok: true,
    subscribers: subsCount,
    sent,
    failed,
    articles: articlesCount,
    ebooks: ebooksCount,
  })
}
