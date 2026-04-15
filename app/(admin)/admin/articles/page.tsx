import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArticlesTable } from './ArticlesTable'

export const metadata: Metadata = { title: 'Admin — Articles' }

export default async function AdminArticlesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, category, source, status, is_published, featured, quality_score, created_at')
    .order('created_at', { ascending: false })

  type ArticleStatus = 'draft' | 'review' | 'published' | 'archived'
  const rows = (articles ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    slug: a.slug as string,
    category: (a.category as string) ?? '',
    source: (a.source as string) ?? 'manual',
    quality_score: a.quality_score as number | null,
    status: ((a.status as ArticleStatus) ??
      (a.is_published ? 'published' : 'draft')) as ArticleStatus,
    created_at: a.created_at as string,
  }))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
          Articles
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/admin/articles/expert-prompt"
            style={{
              color: 'var(--admin-text-muted)',
              fontSize: 12,
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--admin-border)',
              fontFamily: 'var(--fb)',
              fontWeight: 600,
            }}
          >
            Prompt expert IA
          </Link>
          <Link
            href="/admin/ia/articles"
            style={{
              color: 'var(--admin-accent)',
              fontSize: 13,
              textDecoration: 'none',
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--admin-accent) 50%, transparent)',
              fontFamily: 'var(--fb)',
              fontWeight: 600,
            }}
          >
            Générer avec IA
          </Link>
          <Link
            href="/admin/articles/new"
            style={{
              background: 'var(--admin-accent)',
              color: '#0F1117',
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              fontFamily: 'var(--fb)',
              textDecoration: 'none',
            }}
          >
            + Nouvel article
          </Link>
        </div>
      </div>
      <ArticlesTable rows={rows} />
    </>
  )
}
