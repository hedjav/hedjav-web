import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { EbooksTable } from './EbooksTable'

export const metadata: Metadata = { title: 'Admin — Ebooks' }

export default async function AdminEbooksPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: ebooks } = await supabase
    .from('ebooks')
    .select('id, title, slug, price, cover_image_url, is_published, is_featured, created_at')
    .order('created_at', { ascending: false })

  const rows = (ebooks ?? []).map((e) => ({
    id: e.id as string,
    title: e.title as string,
    slug: e.slug as string,
    price: e.price as number,
    cover_image_url: e.cover_image_url as string | null,
    is_published: e.is_published as boolean,
    is_featured: e.is_featured as boolean,
    created_at: e.created_at as string,
    deleteAction: '',
  }))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
          Ebooks
        </h1>
        <Link
          href="/admin/ebooks/new"
          style={{
            background: 'var(--admin-accent)',
            color: '#0F1117',
            padding: '10px 20px',
            borderRadius: 8,
            fontFamily: 'var(--fb)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + Nouvel ebook
        </Link>
      </div>
      <EbooksTable rows={rows} />
    </>
  )
}
