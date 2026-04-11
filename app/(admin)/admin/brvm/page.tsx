import type { Metadata } from 'next'
import Link from 'next/link'
import { BRVMTriggerButton } from './BRVMTriggerButton'
import { BrvmDocumentsPanel } from './BrvmDocumentsPanel'
import { BrvmSubNav } from './BrvmSubNav'
import { listDocuments, getDocumentStats } from '@/lib/brvm/documents'
import { getAllSources } from '@/lib/brvm/sources'
import { DOC_TYPE_LABELS } from '@/lib/brvm/types'

export const metadata: Metadata = { title: 'Admin — Veille BRVM' }
export const dynamic = 'force-dynamic'

export default async function AdminBRVMPage() {
  // Parallèle : stats + toutes les sources + liste initiale (50 derniers)
  const [stats, sources, { rows: docs }] = await Promise.all([
    getDocumentStats().catch(() => ({
      total: 0,
      boc_total: 0,
      new_today: 0,
      new_7d: 0,
      new_boc_today: 0,
      new_boc_7d: 0,
      unprocessed: 0,
    })),
    getAllSources().catch(() => []),
    listDocuments({ limit: 100 }).catch(() => ({ rows: [], total: 0 })),
  ])

  const statCards = [
    {
      label: 'Nouveaux BOC aujourd\'hui',
      value: String(stats.new_boc_today),
      accent: 'var(--admin-accent, #C5A028)',
      hint: 'Priorité métier',
    },
    {
      label: 'Nouveaux BOC (7j)',
      value: String(stats.new_boc_7d),
      accent: '#8BE07A',
    },
    {
      label: 'Total documents indexés',
      value: String(stats.total),
      accent: 'var(--admin-info, #4A90D9)',
      hint: `${stats.boc_total} BOC`,
    },
    {
      label: 'Nouveautés à traiter',
      value: String(stats.unprocessed),
      accent: '#ff9b9b',
      hint: stats.unprocessed > 0 ? 'À réviser' : 'À jour',
    },
  ]

  return (
    <>
      <BrvmSubNav />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--s8)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'var(--text-4xl)',
              fontWeight: 600,
              color: 'var(--admin-text)',
            }}
          >
            Veille BRVM
          </h1>
          <p
            style={{
              color: 'var(--admin-text-muted)',
              fontSize: 'var(--text-sm)',
              marginTop: 4,
            }}
          >
            Suivi des documents publiés par brvm.org, bfin et sikafinance. Priorité : BOC.
          </p>
        </div>
        <BRVMTriggerButton />
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--s4)',
          marginBottom: 'var(--s8)',
        }}
      >
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
              {card.label}
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: card.accent,
                fontFamily: 'var(--fm)',
                lineHeight: 1,
              }}
            >
              {card.value}
            </p>
            {card.hint && (
              <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>
                {card.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Sources état */}
      {sources.length > 0 && (
        <div
          style={{
            background: 'var(--admin-surface)',
            borderRadius: 12,
            padding: 'var(--s4) var(--s5)',
            border: '1px solid var(--admin-border)',
            marginBottom: 'var(--s6)',
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12,
          }}
        >
          <span
            style={{
              color: 'var(--admin-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontWeight: 700,
            }}
          >
            Sources
          </span>
          {sources.map((s) => {
            const ok = s.last_success_at !== null
            const scrapeText = s.last_scraped_at
              ? new Date(s.last_scraped_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'jamais'
            return (
              <span
                key={s.id}
                style={{
                  color: 'var(--admin-text, #E7ECF5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title={s.last_error ?? ''}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ok ? '#8BE07A' : s.last_scraped_at ? '#ff9b9b' : '#6B7280',
                  }}
                />
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--admin-text-muted)' }}>· {scrapeText}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Panneau documents (tabs + DataTable, client-side) */}
      <BrvmDocumentsPanel
        initialDocs={docs.map((d) => ({
          id: d.id,
          doc_type: d.doc_type,
          doc_type_label: DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type,
          doc_date: d.doc_date,
          title: d.title,
          source_name: d.source_name,
          source_url: d.source_url,
          pdf_url: d.pdf_url,
          issuer_name: d.issuer_name,
          is_new: d.is_new,
          is_processed: d.is_processed,
          discovered_at: d.discovered_at,
        }))}
      />

      {/* Footer nav */}
      <div style={{ marginTop: 'var(--s6)', textAlign: 'center' }}>
        <Link
          href="/admin/articles?category=BRVM"
          style={{
            color: 'var(--admin-text-muted)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Voir les articles générés depuis la veille BRVM →
        </Link>
      </div>
    </>
  )
}
