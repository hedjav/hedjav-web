import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeBRVMIndices, scrapeBRVMNews } from '@/lib/brvm/scraper'
import { generateBRVMArticle } from '@/lib/brvm/article-generator'

/**
 * POST /api/brvm/daily
 *
 * Scrape BRVM, génère un article via Claude, insère dans articles.
 * Protégé par INTERNAL_API_TOKEN.
 * CRON recommandé : tous les jours à 18h (après clôture BRVM).
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Scrape BRVM
    const [indices, news] = await Promise.all([
      scrapeBRVMIndices(),
      scrapeBRVMNews(),
    ])

    if (indices.indices.length === 0 && news.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Aucune donnée BRVM récupérée (site indisponible ou format changé)',
      })
    }

    // 2. Générer l'article
    const article = await generateBRVMArticle(indices, news)

    // 3. Insérer dans Supabase
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const slug = slugify(article.title)
    const now = new Date().toISOString()

    const { data, error } = await admin.from('articles').insert({
      title: article.title,
      slug,
      body: article.body,
      excerpt: article.excerpt,
      category: article.category,
      source: 'ai',
      is_published: true,
      published_at: now,
      metadata: {
        created_by: 'brvm-scraper',
        indices_date: indices.date,
        indices_count: indices.indices.length,
        news_count: news.length,
      },
    }).select('id, title, slug').single()

    if (error) {
      console.error('[brvm-daily] Insertion échouée:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      article_title: data.title,
      article_slug: data.slug,
      article_id: data.id,
      indices_count: indices.indices.length,
      news_count: news.length,
    })
  } catch (e) {
    console.error('[brvm-daily] Erreur inattendue:', e)
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
