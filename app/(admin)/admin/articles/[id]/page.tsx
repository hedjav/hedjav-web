import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AdminArticleForm } from '@/components/features/AdminArticleForm'
import type { Article } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Admin — Éditer article' }

type PageProps = { params: Promise<{ id: string }> }

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <>
      <Link
        href="/admin/articles"
        style={{ color: '#6B82B0', fontSize: 13, marginBottom: 16, display: 'inline-block' }}
      >
        ← Retour aux articles
      </Link>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 32,
        }}
      >
        Éditer : {(data as Article).title}
      </h1>
      <AdminArticleForm article={data as Article} />
    </>
  )
}
