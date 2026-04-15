import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BRVMTriggerButton } from './BRVMTriggerButton'
import { PageHeader } from './_components/PageHeader'
import { listDocuments } from '@/lib/brvm/documents'
import { listSnapshots, getLatestIndexValues } from '@/lib/brvm/market'
import { listEmetteurs } from '@/lib/brvm/emetteurs'
import { getAllSources } from '@/lib/brvm/sources'
import { DOC_FAMILY_LABELS, type DocFamily } from '@/lib/brvm/types'

export const metadata: Metadata = { title: 'Admin — Centre de Veille BRVM' }
export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function familyStats(): Promise<Record<DocFamily, { total: number; last7d: number }>> {
  const d = db()
  const sevenDays = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const families: DocFamily[] = ['market', 'report', 'announcement', 'publication']
  const init = Object.fromEntries(
    families.map((f) => [f, { total: 0, last7d: 0 }])
  ) as Record<DocFamily, { total: number; last7d: number }>

  const totals = await Promise.all(
    families.map((f) =>
      d.from('brvm_documents').select('*', { count: 'exact', head: true }).eq('doc_family', f)
    )
  )
  const last7d = await Promise.all(
    families.map((f) =>
      d
        .from('brvm_documents')
        .select('*', { count: 'exact', head: true })
        .eq('doc_family', f)
        .gte('discovered_at', sevenDays)
    )
  )
  families.forEach((f, i) => {
    init[f] = { total: totals[i].count ?? 0, last7d: last7d[i].count ?? 0 }
  })
  return init
}

export default async function AdminBRVMOverviewPage() {
  const [stats, latestDocs, emetteurs, snapshots, indices, sources] = await Promise.all([
    familyStats(),
    listDocuments({ period: 'all', sort: 'discovered_desc', limit: 4 }).catch(() => ({
      rows: [],
      total: 0,
    })),
    listEmetteurs({ limit: 1 }).catch(() => ({ rows: [], total: 0 })),
    listSnapshots({ limit: 1 }).catch(() => []),
    getLatestIndexValues().catch(() => []),
    getAllSources().catch(() => []),
  ])

  const universes: Array<{
    key: DocFamily
    label: string
    description: string
    href: string
    accent: string
    total: number
    last7d: number
    extra?: string
  }> = [
    {
      key: 'market',
      label: DOC_FAMILY_LABELS.market,
      description: 'Résumé séance, cours actions et obligations, indices BRVM.',
      href: '/admin/brvm/marche',
      accent: '#1a4480',
      total: snapshots.length,
      last7d: indices.length,
      extra: snapshots[0]
        ? `Dernière séance : ${new Date(snapshots[0].snapshot_date).toLocaleDateString('fr-FR')}`
        : 'Aucun snapshot',
    },
    {
      key: 'report',
      label: DOC_FAMILY_LABELS.report,
      description:
        'Rapports annuels, semestriels, trimestriels, états financiers et commentaires.',
      href: '/admin/brvm/rapports',
      accent: '#1e5631',
      total: stats.report.total,
      last7d: stats.report.last7d,
      extra: emetteurs.total ? `${emetteurs.total} sociétés cotées` : 'Référentiel vide',
    },
    {
      key: 'announcement',
      label: DOC_FAMILY_LABELS.announcement,
      description:
        'Convocations AG, résolutions, notations, ESV, communiqués, franchissements, dirigeants.',
      href: '/admin/brvm/annonces',
      accent: '#7a4a0c',
      total: stats.announcement.total,
      last7d: stats.announcement.last7d,
    },
    {
      key: 'publication',
      label: DOC_FAMILY_LABELS.publication,
      description:
        'BOC, bulletins mensuels, statistiques trimestrielles, années boursières, avis, données économiques, valeurs liquidatives.',
      href: '/admin/brvm/publications',
      accent: '#4a2978',
      total: stats.publication.total,
      last7d: stats.publication.last7d,
    },
  ]

  return (
    <>
      <PageHeader
        title="Centre de Veille BRVM"
        subtitle="Hub unifié, 4 univers fidèles à la logique métier de la BRVM : données de marché, rapports sociétés cotées, annonces émetteurs, publications. Tri décroissant partout, plus récent en haut."
        right={<BRVMTriggerButton />}
      />

      {/* 4 cards univers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--s4)',
          marginBottom: 'var(--s6)',
        }}
      >
        {universes.map((u) => (
          <Link
            key={u.key}
            href={u.href}
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 14,
              padding: 'var(--s5)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 200,
              transition: 'border-color 0.15s, transform 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: u.accent,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--fb)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: 'var(--admin-text-muted)',
                }}
              >
                Univers
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--admin-text)',
                lineHeight: 1.15,
              }}
            >
              {u.label}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--admin-text-muted)',
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {u.description}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--admin-text)',
                  lineHeight: 1,
                }}
              >
                {u.total.toLocaleString('fr-FR')}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              >
                {u.key === 'market' ? 'snapshots' : 'documents'} · +{u.last7d} sur 7 j
              </span>
            </div>
            {u.extra && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--admin-text-muted)',
                  borderTop: '1px solid var(--admin-border)',
                  paddingTop: 10,
                }}
              >
                {u.extra}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Dernières publications (preview transversale) */}
      <section style={{ marginBottom: 'var(--s6)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--s4)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--admin-text)',
            }}
          >
            Dernières nouveautés
          </h2>
          <Link
            href="/admin/brvm/publications"
            style={{
              fontSize: 13,
              color: 'var(--admin-accent, #C5A028)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Voir tout →
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--s3)',
          }}
        >
          {latestDocs.rows.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
              Aucun document indexé pour l’instant. Lancez la veille pour peupler les 4 univers.
            </p>
          ) : (
            latestDocs.rows.map((doc) => (
              <a
                key={doc.id}
                href={doc.pdf_url ?? doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 10,
                  padding: 'var(--s4)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 11,
                    color: 'var(--admin-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                  }}
                >
                  {doc.doc_date
                    ? new Date(doc.doc_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    color: 'var(--admin-text)',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {doc.title}
                </span>
                {doc.issuer_name && (
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    {doc.issuer_name}
                  </span>
                )}
              </a>
            ))
          )}
        </div>
      </section>

      {/* Sources */}
      {sources.length > 0 && (
        <div
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 12,
            padding: 'var(--s4) var(--s5)',
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12.5,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--admin-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontWeight: 700,
              fontSize: 11,
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--admin-text-muted)' }}>· {scrapeText}</span>
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}
