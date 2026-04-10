import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ScoringClient } from './ScoringClient'

export const metadata: Metadata = { title: 'Admin — Scoring qualite' }

async function getArticles() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await db
    .from('articles')
    .select('id, title, category, source, quality_score, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Array<{
    id: string
    title: string
    category: string
    source: string
    quality_score: number | null
    is_published: boolean
    created_at: string
  }>
}

export default async function AdminScoringPage() {
  const articles = await getArticles()

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 4 }}>
        Scoring qualite
      </h1>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s8)' }}>
        Analyse IA des articles sur 5 criteres UEMOA (pertinence, redaction, SEO, donnees chiffrees, CTA).
      </p>
      <ScoringClient articles={articles} />
    </>
  )
}
