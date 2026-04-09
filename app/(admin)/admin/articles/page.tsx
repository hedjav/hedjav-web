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
    .select('id, title, slug, category, source, is_published, featured, quality_score, created_at')
    .order('created_at', { ascending: false })

  const rows = (articles ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    slug: a.slug as string,
    category: (a.category as string) ?? '',
    source: (a.source as string) ?? 'manual',
    quality_score: a.quality_score as number | null,
    is_published: a.is_published as boolean,
    created_at: a.created_at as string,
  }))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
          Articles
        </h1>
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
      <ArticlesTable rows={rows} />
    </>
  )
}
