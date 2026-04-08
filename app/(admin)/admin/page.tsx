import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin — Vue d’ensemble' }

async function getStats() {
  const supabase = await createSupabaseServerClient()
  const [ebooks, articles, members, sales] = await Promise.all([
    supabase.from('ebooks').select('id', { count: 'exact', head: true }),
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ])
  return {
    ebooks: ebooks.count ?? 0,
    articles: articles.count ?? 0,
    members: members.count ?? 0,
    sales: sales.count ?? 0,
  }
}

export default async function AdminHome() {
  const stats = await getStats()

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', marginBottom: 'var(--s8)', color: '#fff' }}>
        Vue d’ensemble
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--s5)',
        }}
      >
        <StatCard label="Ebooks publiés" value={stats.ebooks} />
        <StatCard label="Articles publiés" value={stats.articles} />
        <StatCard label="Membres inscrits" value={stats.members} />
        <StatCard label="Ventes confirmées" value={stats.sales} />
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#1B2A4A',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 'var(--r16)',
        padding: 'var(--s6)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'rgba(255,255,255,.5)',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          fontWeight: 600,
          marginBottom: 'var(--s3)',
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-5xl)', fontWeight: 600, color: '#C5A028' }}>
        {value}
      </div>
    </div>
  )
}
