import type { Metadata } from 'next'
import Link from 'next/link'
import { BrvmSubNav } from '../BrvmSubNav'
import { DownloaderForm } from './DownloaderForm'
import { getDocumentStats } from '@/lib/brvm/documents'
import { getAllSources } from '@/lib/brvm/sources'
import {
  getDownloaderDiagnostic,
  type DownloaderDiagnostic,
} from '@/lib/brvm/pdf-downloader'

export const metadata: Metadata = { title: 'Admin — BRVM Downloader PDF' }
export const dynamic = 'force-dynamic'

export default async function BrvmDownloaderPage() {
  const [stats, sources, snapshot] = await Promise.all([
    getDocumentStats().catch(() => null),
    getAllSources().catch(() => []),
    getDownloaderDiagnostic().catch(() => null),
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
            marginBottom: 'var(--s6)',
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

      {/* Bandeau d'état de la DB : visible AVANT le form pour diagnostiquer
          table vide / docs sans date / plage hors portée sans avoir à cliquer */}
      {snapshot && <DbSnapshotPanel snapshot={snapshot} />}

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

/**
 * Bandeau d'état de `brvm_documents` affiché avant le form.
 * - Rouge si la table est vide → bloque explicitement et renvoie vers la veille
 * - Jaune si certains docs ont doc_date = NULL → rassure (fallback actif)
 * - Mini-table des 5 derniers docs insérés pour voir l'activité du scraper
 */
function DbSnapshotPanel({ snapshot }: { snapshot: DownloaderDiagnostic }) {
  const isEmpty = snapshot.db_total === 0
  const hasNullDates = snapshot.db_without_doc_date > 0

  return (
    <div style={{ marginBottom: 'var(--s8)' }}>
      {isEmpty && (
        <div
          style={{
            padding: 'var(--s5) var(--s6)',
            marginBottom: 'var(--s4)',
            background: 'rgba(231, 76, 60, 0.12)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            borderRadius: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--fd)',
              fontSize: 18,
              fontWeight: 600,
              color: '#ff9b9b',
            }}
          >
            ⚠ La table brvm_documents est vide
          </p>
          <p
            style={{
              margin: 'var(--s3) 0 0',
              fontSize: 13,
              color: 'var(--admin-text-muted)',
              lineHeight: 1.6,
            }}
          >
            Aucun document n&apos;est indexé. Lance d&apos;abord la veille BRVM pour que
            le scraper peuple la table. Tu pourras ensuite revenir ici pour télécharger
            les PDFs par période.
          </p>
          <Link
            href="/admin/brvm"
            style={{
              display: 'inline-block',
              marginTop: 'var(--s4)',
              padding: '10px 20px',
              background: 'var(--admin-accent, #C5A028)',
              color: '#0F1117',
              borderRadius: 8,
              fontFamily: 'var(--fb)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            → Aller à /admin/brvm pour lancer la veille
          </Link>
        </div>
      )}

      {!isEmpty && hasNullDates && (
        <div
          style={{
            padding: 'var(--s4) var(--s5)',
            marginBottom: 'var(--s4)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--admin-text)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#F59E0B' }}>
              {snapshot.db_without_doc_date} document(s)
            </strong>{' '}
            sans <code>doc_date</code> extraite. Ils restent éligibles au téléchargement
            via le fallback <code>discovered_at</code>.
          </p>
        </div>
      )}

      {!isEmpty && (
        <div
          style={{
            background: 'var(--admin-surface)',
            borderRadius: 12,
            padding: 'var(--s5)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--s4)',
              fontFamily: 'var(--fd)',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--admin-text)',
            }}
          >
            État de la base BRVM
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 'var(--s3)',
              marginBottom: 'var(--s5)',
            }}
          >
            <Metric label="Total" value={snapshot.db_total} />
            <Metric label="Avec date" value={snapshot.db_with_doc_date} />
            <Metric label="Sans date (NULL)" value={snapshot.db_without_doc_date} />
            <Metric
              label="Plage doc_date"
              value={
                snapshot.min_doc_date && snapshot.max_doc_date
                  ? `${snapshot.min_doc_date} → ${snapshot.max_doc_date}`
                  : '—'
              }
            />
            <Metric
              label="Dernière découverte"
              value={
                snapshot.max_discovered_at
                  ? new Date(snapshot.max_discovered_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
          </div>

          {snapshot.last_5_inserted.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                5 derniers documents insérés
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {snapshot.last_5_inserted.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 90px 1fr 140px',
                      gap: 12,
                      padding: '8px 12px',
                      background: 'var(--admin-bg)',
                      borderRadius: 6,
                      border: '1px solid var(--admin-border)',
                      fontSize: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        background: 'rgba(197, 160, 40, 0.15)',
                        color: 'var(--admin-accent, #C5A028)',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '.04em',
                        textAlign: 'center',
                      }}
                    >
                      {d.doc_type}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--fm)',
                        color: d.doc_date ? 'var(--admin-text)' : 'var(--admin-text-muted)',
                      }}
                    >
                      {d.doc_date ?? '(NULL)'}
                    </span>
                    <span
                      style={{
                        color: 'var(--admin-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={d.title}
                    >
                      {d.title}
                    </span>
                    <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>
                      Découvert{' '}
                      {new Date(d.discovered_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: 'var(--admin-bg)',
        padding: 'var(--s3)',
        borderRadius: 8,
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--admin-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--admin-text)',
          fontFamily: 'var(--fm)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
