import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '../_components/PageHeader'
import { EmptyState } from '../_components/EmptyState'
import { getLatestIndexValues, listIndexTicks, listSnapshots, listTicks } from '@/lib/brvm/market'

export const metadata: Metadata = { title: 'BRVM — Données de marché' }
export const dynamic = 'force-dynamic'

type MarketTab = 'resume' | 'actions' | 'obligations' | 'indices'

const TABS: Array<{ key: MarketTab; label: string }> = [
  { key: 'resume', label: 'Résumé séance' },
  { key: 'actions', label: 'Cours actions' },
  { key: 'obligations', label: 'Cours obligations' },
  { key: 'indices', label: 'Indices' },
]

function fmtFcfa(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
}
function fmtPct(n: number | null): string {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)} %`
}
function fmtNumber(n: number | null, digits = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: digits })
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function BrvmMarchePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const tabParam = typeof params.tab === 'string' ? params.tab : 'resume'
  const tab: MarketTab = (TABS.find((t) => t.key === tabParam)?.key ?? 'resume') as MarketTab

  return (
    <>
      <PageHeader
        title="Données de marché"
        subtitle="Résumé de séance, cours des actions et obligations, indices BRVM. Séries temporelles historisées, tri du plus récent au plus ancien."
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { label: 'Données de marché' },
        ]}
      />

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 'var(--s5)',
          borderBottom: '1px solid var(--admin-border)',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <Link
              key={t.key}
              href={`/admin/brvm/marche?tab=${t.key}`}
              role="tab"
              aria-selected={active}
              style={{
                padding: '11px 18px',
                textDecoration: 'none',
                borderBottom: active
                  ? '2px solid var(--admin-accent, #C5A028)'
                  : '2px solid transparent',
                color: active
                  ? 'var(--admin-accent, #C5A028)'
                  : 'var(--admin-text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      {tab === 'resume' && <ResumePanel />}
      {tab === 'actions' && <QuotesPanel market="actions" />}
      {tab === 'obligations' && <QuotesPanel market="obligations" />}
      {tab === 'indices' && <IndicesPanel />}
    </>
  )
}

async function ResumePanel() {
  const snapshots = await listSnapshots({ limit: 30 }).catch(() => [])
  if (snapshots.length === 0) {
    return (
      <EmptyState
        title="Aucun résumé de séance"
        message="Lancez la veille marché pour récupérer le résumé de la dernière séance (valeur des transactions, capitalisation, titres échangés)."
      />
    )
  }
  const latest = snapshots[0]

  const kpis = [
    { label: 'Valeur transactions', value: fmtFcfa(latest.valeur_transactions_fcfa) },
    { label: 'Capitalisation actions', value: fmtFcfa(latest.capi_actions_fcfa) },
    { label: 'Capitalisation obligations', value: fmtFcfa(latest.capi_obligations_fcfa) },
    {
      label: 'Titres échangés',
      value: fmtNumber(latest.nb_titres_echanges ?? null, 0),
    },
    {
      label: 'Nombre transactions',
      value: fmtNumber(latest.nb_transactions ?? null, 0),
    },
  ]

  return (
    <>
      <div
        style={{
          marginBottom: 'var(--s5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--admin-text)',
          }}
        >
          Séance du {fmtDate(latest.snapshot_date)}
        </p>
        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
          {snapshots.length} séances historisées
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--s3)',
          marginBottom: 'var(--s6)',
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 10,
              padding: 'var(--s4)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: 'var(--admin-text-muted)',
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {k.label}
            </p>
            <p
              style={{
                fontFamily: 'var(--fm)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--admin-text)',
              }}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Historique */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--admin-border)',
            fontSize: 12,
            color: 'var(--admin-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontWeight: 700,
          }}
        >
          Historique (30 dernières séances)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background:
                    'color-mix(in srgb, var(--admin-surface) 92%, black)',
                  color: 'var(--admin-text-muted)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                }}
              >
                <th style={{ padding: '10px 20px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>
                  Valeur transactions
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>
                  Capi actions
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>
                  Capi obligations
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>
                  Nb transactions
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, i) => (
                <tr
                  key={s.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--admin-border)' : 'none' }}
                >
                  <td
                    style={{
                      padding: '12px 20px',
                      fontFamily: 'var(--fm)',
                      fontSize: 12.5,
                    }}
                  >
                    {fmtDate(s.snapshot_date)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                    }}
                  >
                    {fmtFcfa(s.valeur_transactions_fcfa)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                    }}
                  >
                    {fmtFcfa(s.capi_actions_fcfa)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                    }}
                  >
                    {fmtFcfa(s.capi_obligations_fcfa)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                    }}
                  >
                    {fmtNumber(s.nb_transactions, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

async function QuotesPanel({ market }: { market: 'actions' | 'obligations' }) {
  const { rows, total } = await listTicks({ market, limit: 300 }).catch(() => ({
    rows: [],
    total: 0,
  }))
  if (rows.length === 0) {
    return (
      <EmptyState
        title={`Aucun cours ${market === 'actions' ? 'actions' : 'obligations'}`}
        message="Lancez la veille marché pour récupérer les dernières cotations. Les cours s'historisent automatiquement à chaque exécution."
      />
    )
  }

  // Garde la plus récente cotation par émetteur
  const seen = new Set<string>()
  type Row = (typeof rows)[number]
  const latestPerEmetteur: Row[] = []
  for (const row of rows) {
    if (!row.emetteur_id || seen.has(row.emetteur_id)) continue
    seen.add(row.emetteur_id)
    latestPerEmetteur.push(row)
  }

  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--admin-border)',
          fontSize: 12,
          color: 'var(--admin-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Cours {market === 'actions' ? 'actions' : 'obligations'} — {latestPerEmetteur.length}{' '}
          valeurs
        </span>
        <span>{total.toLocaleString('fr-FR')} ticks historisés</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: 'color-mix(in srgb, var(--admin-surface) 92%, black)',
                fontSize: 11,
                color: 'var(--admin-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              <th style={{ padding: '10px 20px', textAlign: 'left' }}>Émetteur</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Cours</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Précédent</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Variation</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Volume</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {latestPerEmetteur.map((row, i) => {
              const variation = row.variation_pct
              const variationColor =
                variation == null
                  ? 'var(--admin-text-muted)'
                  : variation > 0
                    ? '#1e5631'
                    : variation < 0
                      ? '#B23A48'
                      : 'var(--admin-text-muted)'
              return (
                <tr
                  key={row.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--admin-border)' : 'none' }}
                >
                  <td style={{ padding: '12px 20px' }}>
                    {row.emetteur_slug ? (
                      <Link
                        href={`/admin/brvm/rapports/${row.emetteur_slug}`}
                        style={{
                          color: 'var(--admin-text)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {row.emetteur_name ?? row.emetteur_slug}
                      </Link>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                      fontWeight: 600,
                    }}
                  >
                    {fmtNumber(row.close)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                      color: 'var(--admin-text-muted)',
                    }}
                  >
                    {fmtNumber(row.previous_close)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                      color: variationColor,
                      fontWeight: 600,
                    }}
                  >
                    {fmtPct(variation)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                    }}
                  >
                    {fmtNumber(row.volume ?? null, 0)}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: 'var(--fm)',
                      color: 'var(--admin-text-muted)',
                      fontSize: 12,
                    }}
                  >
                    {fmtDate(row.tick_date)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function IndicesPanel() {
  const [latest, history] = await Promise.all([
    getLatestIndexValues().catch(() => []),
    listIndexTicks({ limit: 200 }).catch(() => []),
  ])

  if (latest.length === 0) {
    return (
      <EmptyState
        title="Aucun indice indexé"
        message="Lancez la veille marché pour peupler l'historique des indices BRVM-Composite, BRVM-30 et BRVM-Prestige."
      />
    )
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--s3)',
          marginBottom: 'var(--s6)',
        }}
      >
        {latest.map((idx) => {
          const v = idx.variation_pct
          const color = v == null ? 'var(--admin-text)' : v > 0 ? '#1e5631' : v < 0 ? '#B23A48' : 'var(--admin-text)'
          return (
            <div
              key={idx.index_code}
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                borderRadius: 12,
                padding: 'var(--s5)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--fb)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: 'var(--admin-text-muted)',
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {idx.index_code}
              </p>
              <p
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--admin-text)',
                  lineHeight: 1,
                }}
              >
                {fmtNumber(idx.value, 2)}
              </p>
              <p
                style={{
                  marginTop: 10,
                  fontFamily: 'var(--fm)',
                  fontSize: 13,
                  color,
                  fontWeight: 600,
                }}
              >
                {fmtPct(idx.variation_pct)} · YTD {fmtPct(idx.ytd_pct)}
              </p>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                }}
              >
                {fmtDate(idx.tick_date)}
              </p>
            </div>
          )
        })}
      </div>

      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--admin-border)',
            fontSize: 11,
            color: 'var(--admin-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontWeight: 700,
          }}
        >
          Historique indices
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: 'color-mix(in srgb, var(--admin-surface) 92%, black)',
                  color: 'var(--admin-text-muted)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                }}
              >
                <th style={{ padding: '10px 20px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px 20px', textAlign: 'left' }}>Indice</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>Valeur</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>Variation</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>YTD</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const v = h.variation_pct
                const color =
                  v == null
                    ? 'var(--admin-text-muted)'
                    : v > 0
                      ? '#1e5631'
                      : v < 0
                        ? '#B23A48'
                        : 'var(--admin-text-muted)'
                return (
                  <tr
                    key={h.id}
                    style={{ borderTop: i > 0 ? '1px solid var(--admin-border)' : 'none' }}
                  >
                    <td
                      style={{
                        padding: '12px 20px',
                        fontFamily: 'var(--fm)',
                        fontSize: 12.5,
                      }}
                    >
                      {fmtDate(h.tick_date)}
                    </td>
                    <td style={{ padding: '12px 20px', fontWeight: 600 }}>{h.index_code}</td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        fontFamily: 'var(--fm)',
                      }}
                    >
                      {fmtNumber(h.value, 2)}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        fontFamily: 'var(--fm)',
                        color,
                      }}
                    >
                      {fmtPct(h.variation_pct)}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        fontFamily: 'var(--fm)',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      {fmtPct(h.ytd_pct)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
