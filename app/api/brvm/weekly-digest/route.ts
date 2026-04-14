import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/ai/client'
import { sendEmail } from '@/lib/email/smtp'
import { brvmWeeklyEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'
import { siteUrl as absoluteUrl } from '@/lib/url'

/**
 * POST /api/brvm/weekly-digest
 *
 * 1. Query brvm_data de la semaine
 * 2. Synthese hebdo via Claude (800-1200 mots, format article blog)
 * 3. Creer article brouillon (category='BRVM', source='ai', is_published=false)
 * 4. Email admins
 * 5. Notification + log IA
 *
 * Protege par INTERNAL_API_TOKEN.
 * CRON : vendredi 19h.
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
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const now = new Date()
    const weekEnd = now.toISOString().slice(0, 10)
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

    // ── 1. Recuperer les donnees BRVM de la semaine ──────────
    const { data: weekData, error: weekErr } = await db
      .from('brvm_data')
      .select('*')
      .gte('data_date', weekStart)
      .lte('data_date', weekEnd)
      .order('data_date', { ascending: false })

    if (weekErr) {
      console.error('[brvm-weekly] Erreur query brvm_data:', weekErr)
      return NextResponse.json({ ok: false, error: weekErr.message }, { status: 500 })
    }

    if (!weekData || weekData.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Aucune donnee BRVM cette semaine',
      })
    }

    // Categoriser les donnees
    const resumes = weekData.filter((d) => d.data_type === 'resume_seance')
    const coursData = weekData.filter((d) => d.data_type === 'cours_actions')
    const indicesData = weekData.filter((d) => d.data_type === 'indices')
    const annonces = weekData.filter((d) => d.data_type === 'annonce')
    const bocs = weekData.filter((d) => d.data_type === 'boc_quotidien')
    const documents = bocs.length + annonces.length

    // ── 2. Generer synthese IA ───────────────────────────────
    // Construire le contexte pour l'IA
    const resumesSummary = resumes
      .map((r) => {
        const content = typeof r.content === 'string' ? r.content : ''
        return `### ${r.data_date}\n${r.ai_summary ?? content}`
      })
      .join('\n\n')

    const indicesWeekly = indicesData.slice(0, 3).map((d) => {
      const content = typeof d.content === 'string' ? d.content : ''
      return `${d.data_date}: ${content.slice(0, 300)}`
    }).join('\n')

    const annoncesTxt = annonces.slice(0, 10).map((a) => `- ${a.title}`).join('\n')

    const prompt = `Redige une synthese hebdomadaire BRVM de 800 a 1200 mots pour la semaine du ${weekStart} au ${weekEnd}.

## Resumes des seances
${resumesSummary || 'Non disponibles'}

## Indices de la semaine
${indicesWeekly || 'Non disponibles'}

## Annonces emetteurs
${annoncesTxt || 'Aucune annonce notable'}

## Donnees de la semaine
- ${resumes.length} seances couvertes
- ${coursData.length} jours de cours scrapes
- ${annonces.length} annonces
- ${bocs.length} BOC telecharges

Redige un article complet en markdown avec :
1. Un titre accrocheur (une seule ligne, sans #)
2. Introduction : contexte macro et ambiance generale de la semaine
3. Performance des indices : evolution, tendances
4. Titres marquants : hausses, baisses, volumes remarquables
5. Annonces et evenements cles
6. Perspectives : elements a surveiller la semaine prochaine

Style professionnel mais accessible, en francais, pour un public UEMOA.
Le titre doit etre sur la premiere ligne, suivi d'une ligne vide, puis le corps de l'article.`

    const aiResult = await generateText({
      system: 'Tu es un analyste financier senior specialise sur la BRVM et les marches UEMOA. Tu rediges la synthese hebdomadaire pour egp.hedjav.com, Ecole de la Gestion de Patrimoine (EGP, marque Hedjav).',
      prompt,
      maxTokens: 3000,
      action: 'brvm_weekly_digest',
    })

    let articleTitle: string
    let articleBody: string
    let articleExcerpt: string

    if (aiResult.ok) {
      const lines = aiResult.text.trim().split('\n')
      articleTitle = lines[0].replace(/^#+\s*/, '').trim()
      articleBody = lines.slice(1).join('\n').trim()
      articleExcerpt = articleBody
        .replace(/^[\s\n]+/, '')
        .slice(0, 250)
        .replace(/\n/g, ' ')
        .trim() + '...'
    } else {
      // Fallback article
      articleTitle = `BRVM — Synthese hebdomadaire du ${weekStart} au ${weekEnd}`
      articleBody = `Semaine du ${weekStart} au ${weekEnd}.\n\n${resumes.length} seances couvertes, ${annonces.length} annonces, ${bocs.length} BOC.\n\n*Synthese detaillee a venir.*`
      articleExcerpt = `Synthese de la semaine BRVM du ${weekStart} au ${weekEnd}.`
    }

    if (body.dry_run) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        title: articleTitle,
        excerpt: articleExcerpt,
        week: { start: weekStart, end: weekEnd },
        data_count: weekData.length,
      })
    }

    // ── 3. Creer article brouillon ───────────────────────────
    const slug = slugify(articleTitle)
    const { data: article, error: articleErr } = await db
      .from('articles')
      .insert({
        title: articleTitle,
        slug,
        body: articleBody,
        excerpt: articleExcerpt,
        category: 'BRVM',
        source: 'ai',
        is_published: false,
        metadata: {
          created_by: 'brvm-weekly-digest',
          week_start: weekStart,
          week_end: weekEnd,
          data_count: weekData.length,
          resumes_count: resumes.length,
          annonces_count: annonces.length,
        },
      })
      .select('id, title, slug')
      .single()

    if (articleErr) {
      console.error('[brvm-weekly] Insertion article echouee:', articleErr)
      return NextResponse.json({ ok: false, error: articleErr.message }, { status: 500 })
    }

    // ── 4. Email admins ──────────────────────────────────────
    const articleUrl = absoluteUrl(`/admin/articles/${article.id}`)

    const { data: admins } = await db
      .from('profiles')
      .select('email')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const emailData = brvmWeeklyEmail({
        weekStart,
        weekEnd,
        articleTitle: article.title,
        articleExcerpt,
        articleUrl,
        documentsCount: documents,
      })

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })
      }
    }

    // ── 5. Notification + log IA ─────────────────────────────
    await createNotification(
      'report',
      `Synthese BRVM hebdo : ${article.title}`,
      `Article brouillon cree a partir de ${weekData.length} donnees (${weekStart} au ${weekEnd}). A relire et publier dans /admin/articles/${article.id}.`,
      { article_id: article.id, week_start: weekStart, week_end: weekEnd },
    )

    return NextResponse.json({
      ok: true,
      article_id: article.id,
      article_title: article.title,
      article_slug: article.slug,
      week: { start: weekStart, end: weekEnd },
      data_count: weekData.length,
      documents_count: documents,
    })
  } catch (e) {
    console.error('[brvm-weekly] Erreur inattendue:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
