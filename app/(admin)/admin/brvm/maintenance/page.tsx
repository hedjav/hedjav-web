import type { Metadata } from 'next'
import { PageHeader } from '../_components/PageHeader'
import { generateMaintenanceReport, type CheckStatus, type MaintenanceReport } from '@/lib/brvm/maintenance'

export const metadata: Metadata = { title: 'Admin — BRVM Maintenance' }
export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<CheckStatus, { bg: string; fg: string; icon: string }> = {
  ok: { bg: 'rgba(139, 224, 122, 0.15)', fg: '#8BE07A', icon: '✓' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#F59E0B', icon: '!' },
  critical: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#ff9b9b', icon: '✗' },
  unknown: { bg: 'rgba(107, 114, 128, 0.15)', fg: '#9CA3AF', icon: '?' },
}

export default async function BrvmMaintenancePage() {
  const report: MaintenanceReport = await generateMaintenanceReport().catch(
    (e: unknown): MaintenanceReport => ({
      generated_at: new Date().toISOString(),
      overall_status: 'critical',
      summary: { checks_passed: 0, checks_warning: 0, checks_critical: 1 },
      checks: [
        {
          id: 'report_generation',
          label: 'Génération du rapport',
          status: 'critical',
          detail: e instanceof Error ? e.message : 'Erreur inconnue',
          hint: 'Vérifie les credentials Supabase et les logs PM2',
        },
      ],
      sources: [],
      documents: {
        total: 0,
        by_type: {},
        by_source: {},
        new_today: 0,
        new_7d: 0,
        unprocessed: 0,
        latest_doc_date: null,
        latest_discovered_at: null,
        pdfs_archived: 0,
        pdfs_not_archived: 0,
      },
      recommendations: [],
    })
  )

  const overallColor = STATUS_COLORS[report.overall_status]

  return (
    <>
      <PageHeader
        title="Maintenance BRVM"
        subtitle={`Diagnostic admin — rapport de santé généré le ${new Date(report.generated_at).toLocaleString('fr-FR')}. Supervision cron 30 min via /api/brvm/maintenance.`}
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { label: 'Maintenance' },
        ]}
      />

      {/* Overall status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: 'var(--s4) var(--s6)',
          background: overallColor.bg,
          border: `1px solid ${overallColor.fg}`,
          borderRadius: 12,
          marginBottom: 'var(--s6)',
        }}
      >
        <span
          style={{
            fontSize: 24,
            color: overallColor.fg,
            fontWeight: 700,
          }}
        >
          {overallColor.icon}
        </span>
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--admin-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontWeight: 600,
            }}
          >
            État global
          </div>
          <div
            style={{
              fontSize: 20,
              color: overallColor.fg,
              fontWeight: 700,
              fontFamily: 'var(--fb)',
            }}
          >
            {report.overall_status.toUpperCase()}
          </div>
        </div>
        <div style={{ marginLeft: 20, fontSize: 13, color: 'var(--admin-text-muted)' }}>
          ✓ {report.summary.checks_passed} OK
          {' · '}
          ! {report.summary.checks_warning} warning{report.summary.checks_warning > 1 ? 's' : ''}
          {' · '}
          ✗ {report.summary.checks_critical} critical
        </div>
      </div>

      {/* Recommandations (si présentes) */}
      {report.recommendations.length > 0 && (
        <div
          style={{
            padding: 'var(--s5) var(--s6)',
            marginBottom: 'var(--s6)',
            background: 'rgba(197, 160, 40, 0.08)',
            border: '1px solid rgba(197, 160, 40, 0.3)',
            borderRadius: 12,
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--s3)',
              fontFamily: 'var(--fd)',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--admin-accent, #C5A028)',
            }}
          >
            Actions recommandées
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--admin-text)', fontSize: 13 }}>
            {report.recommendations.map((r, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checks détaillés */}
      <Section title="Checks">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {report.checks.map((c) => {
            const color = STATUS_COLORS[c.status]
            return (
              <div
                key={c.id}
                style={{
                  padding: 'var(--s3) var(--s4)',
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderLeft: `4px solid ${color.fg}`,
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ color: color.fg, fontWeight: 700, fontSize: 14 }}>
                      {color.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--admin-text)',
                      }}
                    >
                      {c.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: color.fg,
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '.06em',
                    }}
                  >
                    {c.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--admin-text-muted)',
                    marginTop: 4,
                    marginLeft: 24,
                  }}
                >
                  {c.detail}
                </div>
                {c.hint && c.status !== 'ok' && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--admin-accent, #C5A028)',
                      marginTop: 4,
                      marginLeft: 24,
                      fontStyle: 'italic',
                    }}
                  >
                    → {c.hint}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Sources */}
      {report.sources.length > 0 && (
        <Section title="Sources">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.sources.map((s) => {
              const color = STATUS_COLORS[s.status]
              return (
                <div
                  key={s.slug}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: 'var(--s3) var(--s4)',
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: color.fg, fontWeight: 700 }}>●</span>
                  <div>
                    <div style={{ color: 'var(--admin-text)', fontWeight: 600 }}>
                      {s.name}
                    </div>
                    <div style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>
                      slug: {s.slug} · priority: {s.priority}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--admin-text-muted)',
                      textAlign: 'right',
                    }}
                  >
                    {s.hours_since_last_success !== null
                      ? `Dernier succès il y a ${s.hours_since_last_success.toFixed(1)}h`
                      : 'Jamais scrapée'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: color.fg,
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    {s.status}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Documents stats */}
      <Section title="Documents">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--s3)',
          }}
        >
          <MetricCard label="Total indexés" value={report.documents.total} />
          <MetricCard label="Découverts < 24h" value={report.documents.new_today} />
          <MetricCard label="Découverts < 7j" value={report.documents.new_7d} />
          <MetricCard label="Non traités" value={report.documents.unprocessed} />
          <MetricCard
            label="PDFs archivés"
            value={`${report.documents.pdfs_archived} / ${report.documents.total}`}
          />
          <MetricCard
            label="Dernière date doc"
            value={report.documents.latest_doc_date ?? '—'}
          />
        </div>

        {Object.keys(report.documents.by_type).length > 0 && (
          <div style={{ marginTop: 'var(--s5)' }}>
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
              Répartition par type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(report.documents.by_type)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--admin-surface)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--admin-text)',
                    }}
                  >
                    <span style={{ color: 'var(--admin-text-muted)' }}>{type}:</span>{' '}
                    <strong>{count}</strong>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s6)' }}>
      <h2
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 'var(--s4)',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 8,
        padding: 'var(--s4)',
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
          fontSize: 24,
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
