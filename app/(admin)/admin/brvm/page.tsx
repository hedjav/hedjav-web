import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BRVMTriggerButton } from './BRVMTriggerButton'
import { BRVMExportForm } from './BRVMExportForm'
import { BRVMDataTable } from './BRVMDataTable'

export const metadata: Metadata = { title: 'Admin — Veille BRVM' }

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getStats() {
  const db = getDb()

  const [lastVeille, docsCount, articlesCount, sentCount] = await Promise.all([
    db
      .from('brvm_data')
      .select('created_at, data_type')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    db.from('brvm_data').select('id', { count: 'exact', head: true }),
    db
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'BRVM'),
    db
      .from('brvm_data')
      .select('id', { count: 'exact', head: true })
      .eq('is_sent_to_members', true),
  ])

  return {
    lastVeille: lastVeille.data?.created_at ?? null,
    docsCount: docsCount.count ?? 0,
    articlesCount: articlesCount.count ?? 0,
    sentCount: sentCount.count ?? 0,
  }
}

async function getBrvmData() {
  const db = getDb()
  const { data } = await db
    .from('brvm_data')
    .select('id, data_date, data_type, title, source_url, file_url, ai_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export default async function AdminBRVMPage() {
  const [stats, brvmData] = await Promise.all([getStats(), getBrvmData()])

  const statCards = [
    {
      label: 'Derniere veille',
      value: stats.lastVeille
        ? new Date(stats.lastVeille).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Jamais',
      color: 'var(--admin-info)',
    },
    {
      label: 'Documents stockes',
      value: String(stats.docsCount),
      color: 'var(--admin-accent)',
    },
    {
      label: 'Articles BRVM',
      value: String(stats.articlesCount),
      color: 'var(--admin-success)',
    },
    {
      label: 'Envoyes aux membres',
      value: String(stats.sentCount),
      color: 'var(--admin-warning)',
    },
  ]

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
            Veille BRVM
          </h1>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Scraping automatique, generation d&apos;articles, export Excel.
          </p>
        </div>
        <BRVMTriggerButton />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s8)' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 12,
              padding: 'var(--s5)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4, fontWeight: 600 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: card.color, fontFamily: 'var(--fm)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Export section */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, padding: 'var(--s5)', border: '1px solid var(--admin-border)', marginBottom: 'var(--s8)' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 'var(--s4)' }}>
          Export Excel
        </h2>
        <BRVMExportForm />
      </div>

      {/* Data table avec recherche, filtres, pagination */}
      <BRVMDataTable data={brvmData as { id: string; data_date: string; data_type: string; title: string | null; source_url: string | null; file_url: string | null; ai_summary: string | null }[]} />

      {/* Link to BRVM articles */}
      <div style={{ marginTop: 'var(--s6)', textAlign: 'center' }}>
        <Link
          href="/admin/articles"
          style={{ color: 'var(--admin-text-muted)', fontSize: 13, textDecoration: 'none' }}
        >
          Voir les articles BRVM dans /admin/articles &rarr;
        </Link>
      </div>
    </>
  )
}

