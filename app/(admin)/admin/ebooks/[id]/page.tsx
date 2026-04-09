import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AdminEbookForm } from '@/components/features/AdminEbookForm'
import type { Ebook } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Admin — Editer ebook' }

type PageProps = { params: Promise<{ id: string }> }

export default async function EditEbookPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await supabase.from('ebooks').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <>
      <Link
        href="/admin/ebooks"
        style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 16, display: 'inline-block' }}
      >
        ← Retour aux ebooks
      </Link>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 32,
        }}
      >
        Editer : {(data as Ebook).title}
      </h1>
      <AdminEbookForm ebook={data as Ebook} />
    </>
  )
}
