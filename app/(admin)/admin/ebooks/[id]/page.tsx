import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AdminEbookForm } from '@/components/features/AdminEbookForm'
import type { Ebook } from '@/lib/supabase/types'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditEbookPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('ebooks').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Éditer : {(data as Ebook).title}
      </h1>
      <AdminEbookForm ebook={data as Ebook} />
    </>
  )
}
