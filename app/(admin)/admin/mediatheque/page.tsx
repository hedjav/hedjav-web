import type { Metadata } from 'next'
import { MediathequeClient } from './MediathequeClient'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = { title: 'Admin — Mediatheque' }

export default async function AdminMediathequePage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: files } = await db.storage.from('media').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const items = (files ?? [])
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => ({
      name: f.name,
      url: `${supabaseUrl}/storage/v1/object/public/media/${f.name}`,
      created_at: f.created_at ?? '',
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
    }))

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Mediatheque
      </h1>
      <MediathequeClient initialItems={items} />
    </>
  )
}
