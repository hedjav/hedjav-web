import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/smtp'
import { newsletterWeeklyEmail } from '@/lib/email/templates'

/**
 * POST /api/newsletter/weekly
 *
 * Envoie la newsletter hebdomadaire aux abonnés actifs.
 * Utilise un template HTML statique (pas de génération Claude).
 *
 * Header : Authorization: Bearer ${INTERNAL_API_TOKEN}
 * Body (optionnel) : { dry_run?: boolean, since_days?: number }
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { dry_run?: boolean; since_days?: number } = {}
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

  const [{ data: articles }, { data: ebooks }, { data: subscribers }] = await Promise.all([
    admin
      .from('articles')
      .select('title, slug, excerpt')
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .gt('published_at', since)
      .order('published_at', { ascending: false }),
    admin
      .from('ebooks')
      .select('title, slug')
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

  const tpl = newsletterWeeklyEmail(
    (articles ?? []).map((a) => ({ title: a.title, slug: a.slug, excerpt: a.excerpt ?? '' })),
    (ebooks ?? []).map((e) => ({ title: e.title, slug: e.slug })),
  )

  if (body.dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      subscribers: subsCount,
      articles: articlesCount,
      ebooks: ebooksCount,
      subject: tpl.subject,
    })
  }

  let sent = 0
  let failed = 0
  for (const sub of subscribers ?? []) {
    const res = await sendEmail({
      to: sub.email as string,
      subject: tpl.subject,
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
    articles: articlesCount,
    ebooks: ebooksCount,
  })
}
