import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

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
          marginBottom: 'var(--s8)',
        }}
      >
        <StatCard label="Ebooks publiés" value={stats.ebooks} />
        <StatCard label="Articles publiés" value={stats.articles} />
        <StatCard label="Membres inscrits" value={stats.members} />
        <StatCard label="Ventes confirmées" value={stats.sales} />
      </div>

      {/* Widget Campagnes */}
      <CampaignWidget />
    </>
  )
}

async function CampaignWidget() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const [{ count: activeCampaigns }, { data: sends }] = await Promise.all([
    db.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('campaign_sends').select('status').in('status', ['sent', 'opened', 'clicked']),
  ])

  const all = sends ?? []
  const opened = all.filter((s) => s.status === 'opened' || s.status === 'clicked').length
  const avgOpen = all.length > 0 ? Math.round((opened / all.length) * 100) : 0

  // Abonnés chauds = score > 5
  const { data: clickedSends } = await db.from('campaign_sends').select('subscriber_email, status').eq('status', 'clicked')
  const scoreMap: Record<string, number> = {}
  for (const s of clickedSends ?? []) { scoreMap[s.subscriber_email] = (scoreMap[s.subscriber_email] ?? 0) + 2 }
  for (const s of all.filter((x) => x.status === 'opened')) {
    scoreMap[(s as { subscriber_email?: string }).subscriber_email ?? ''] = (scoreMap[(s as { subscriber_email?: string }).subscriber_email ?? ''] ?? 0) + 1
  }
  const hotSubs = Object.values(scoreMap).filter((v) => v > 5).length

  return (
    <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', padding: 'var(--s6)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-2xl)', color: '#fff' }}>Campagnes</h2>
        <Link href="/admin/campagnes" style={{ fontSize: 'var(--text-sm)', color: '#C5A028', fontWeight: 600 }}>Voir tout →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s4)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#C5A028' }}>{activeCampaigns ?? 0}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Actives</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#C5A028' }}>{avgOpen}%</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Ouverture moy.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#C5A028' }}>{hotSubs}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Abonnés chauds</div>
        </div>
      </div>
    </div>
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
