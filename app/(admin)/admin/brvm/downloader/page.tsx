import type { Metadata } from 'next'
import { BrvmSubNav } from '../BrvmSubNav'
import { DownloaderForm } from './DownloaderForm'
import { getDocumentStats } from '@/lib/brvm/documents'
import { getAllSources } from '@/lib/brvm/sources'

export const metadata: Metadata = { title: 'Admin — BRVM Downloader PDF' }
export const dynamic = 'force-dynamic'

export default async function BrvmDownloaderPage() {
  const [stats, sources] = await Promise.all([
    getDocumentStats().catch(() => null),
    getAllSources().catch(() => []),
  ])

  return (
    <>
      <BrvmSubNav />

      <div style={{ marginBottom: 'var(--s8)' }}>
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-4xl)',
            fontWeight: 600,
            color: 'var(--admin-text)',
          }}
        >
          Téléchargeur PDF par période
        </h1>
        <p
          style={{
            color: 'var(--admin-text-muted)',
            fontSize: 'var(--text-sm)',
            marginTop: 4,
          }}
        >
          Télécharge les PDFs déjà indexés dans brvm_documents pour une période donnée
          et les archive dans le bucket privé Supabase Storage.
          Idempotent : relancer le même run = déjà archivés skipped.
        </p>
      </div>

      {/* KPI en tête : combien de PDFs déjà archivés */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--s4)',
            marginBottom: 'var(--s8)',
          }}
        >
          <StatCard
            label="Total documents indexés"
            value={String(stats.total)}
            accent="var(--admin-info, #4A90D9)"
          />
          <StatCard
            label="BOC indexés"
            value={String(stats.boc_total)}
            accent="var(--admin-accent, #C5A028)"
            hint="Priorité métier"
          />
          <StatCard
            label="Nouveautés à traiter"
            value={String(stats.unprocessed)}
            accent={stats.unprocessed > 0 ? '#ff9b9b' : '#8BE07A'}
          />
        </div>
      )}

      <DownloaderForm
        sources={sources.map((s) => ({ slug: s.slug, name: s.name }))}
      />
    </>
  )
}

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: string
  accent: string
  hint?: string
}) {
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        borderRadius: 12,
        padding: 'var(--s5)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: 'var(--admin-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: accent,
          fontFamily: 'var(--fm)',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>
          {hint}
        </p>
      )}
    </div>
  )
}
