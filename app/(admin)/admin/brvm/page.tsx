import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BRVMTriggerButton } from './BRVMTriggerButton'
import { BRVMExportForm } from './BRVMExportForm'

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

      {/* Data table */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Date', 'Type', 'Titre', 'Source', 'Actions'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brvmData.map((d) => (
              <tr key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12, color: 'var(--admin-text-muted)', fontFamily: 'var(--fm)' }}>
                  {d.data_date}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: typeColor(d.data_type).bg,
                    color: typeColor(d.data_type).text,
                  }}>
                    {typeLabel(d.data_type)}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title ?? '\u2014'}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12 }}>
                  {d.source_url ? (
                    <a href={d.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-info)', textDecoration: 'none' }}>
                      brvm.org
                    </a>
                  ) : '\u2014'}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 600 }}>
                        Telecharger
                      </a>
                    )}
                    {d.ai_summary && (
                      <span title={d.ai_summary} style={{ color: 'var(--admin-success)', cursor: 'help' }}>
                        IA
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {brvmData.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  Aucune donnee BRVM. Lancez une veille pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    resume_seance: 'Resume',
    cours_actions: 'Cours',
    indices: 'Indices',
    boc_quotidien: 'BOC',
    annonce: 'Annonce',
    rapport_societe: 'Rapport',
  }
  return map[type] ?? type
}

function typeColor(type: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    resume_seance: { bg: 'rgba(59,130,246,.15)', text: 'var(--admin-info)' },
    cours_actions: { bg: 'rgba(197,160,40,.15)', text: 'var(--admin-accent)' },
    indices: { bg: 'rgba(34,197,94,.15)', text: 'var(--admin-success)' },
    boc_quotidien: { bg: 'rgba(168,85,247,.15)', text: '#A855F7' },
    annonce: { bg: 'rgba(245,158,11,.15)', text: 'var(--admin-warning)' },
    rapport_societe: { bg: 'rgba(59,130,246,.15)', text: 'var(--admin-info)' },
  }
  return map[type] ?? { bg: 'rgba(255,255,255,.06)', text: 'var(--admin-text-muted)' }
}
