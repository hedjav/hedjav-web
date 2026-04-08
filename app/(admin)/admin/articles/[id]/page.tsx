import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AdminArticleForm } from '@/components/features/AdminArticleForm'
import type { Article } from '@/lib/supabase/types'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Éditer : {(data as Article).title}
      </h1>
      <AdminArticleForm article={data as Article} />
    </>
  )
}
