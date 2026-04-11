'use client'

import { useState } from 'react'
import { DOC_TYPES, DOC_TYPE_LABELS, type DocType } from '@/lib/brvm/types'

type DownloadItem = {
  document_id: string
  title: string
  doc_type: string
  doc_date: string | null
  source_name: string
  pdf_url: string
  status: string
  storage_path?: string
  file_size?: number
  error?: string
}

type DownloadReport = {
  total_matched: number
  total_processed: number
  duration_ms: number
  counts: {
    downloaded: number
    skipped_already_archived: number
    skipped_no_pdf_url: number
    missing: number
    error: number
  }
  items: DownloadItem[]
}

type Source = { slug: string; name: string }

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days: number): string {
  const d = new Date(Date.now() - days * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

export function DownloaderForm({ sources }: { sources: Source[] }) {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(7))
  const [dateTo, setDateTo] = useState(todayISO())
  const [selectedTypes, setSelectedTypes] = useState<Set<DocType>>(new Set(['boc']))
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(50)
  const [force, setForce] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<DownloadReport | null>(null)

  function toggleType(t: DocType) {
    const next = new Set(selectedTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setSelectedTypes(next)
  }

  function toggleSource(slug: string) {
    const next = new Set(selectedSources)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    setSelectedSources(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const body: Record<string, unknown> = {
        date_from: dateFrom,
        date_to: dateTo,
        limit,
        force,
      }
      if (selectedTypes.size > 0) body.doc_types = Array.from(selectedTypes)
      if (selectedSources.size > 0) body.source_slugs = Array.from(selectedSources)

      const res = await fetch('/api/brvm/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Erreur inconnue')
      } else {
        setReport(data.report as DownloadReport)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--admin-surface)',
          borderRadius: 12,
          padding: 'var(--s6)',
          border: '1px solid var(--admin-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s5)',
          marginBottom: 'var(--s6)',
        }}
      >
        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <Field label="Date début">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
              required
            />
          </Field>
          <Field label="Date fin">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
              required
            />
          </Field>
        </div>

        {/* Presets rapides */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PresetButton
            label="7 derniers jours"
            onClick={() => {
              setDateFrom(daysAgoISO(7))
              setDateTo(todayISO())
            }}
          />
          <PresetButton
            label="30 derniers jours"
            onClick={() => {
              setDateFrom(daysAgoISO(30))
              setDateTo(todayISO())
            }}
          />
          <PresetButton
            label="Ce mois-ci"
            onClick={() => {
              const now = new Date()
              const first = new Date(now.getFullYear(), now.getMonth(), 1)
              setDateFrom(first.toISOString().slice(0, 10))
              setDateTo(todayISO())
            }}
          />
          <PresetButton
            label="Toute l'année en cours"
            onClick={() => {
              const now = new Date()
              setDateFrom(`${now.getFullYear()}-01-01`)
              setDateTo(todayISO())
            }}
          />
        </div>

        {/* Types */}
        <Field label="Types de document">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DOC_TYPES.map((t) => (
              <Checkbox
                key={t}
                label={DOC_TYPE_LABELS[t]}
                checked={selectedTypes.has(t)}
                onChange={() => toggleType(t)}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
            Cochez au moins un type. Laisser tout coché = tous les types.
            Priorité métier : <strong>BOC</strong>.
          </p>
        </Field>

        {/* Sources */}
        {sources.length > 0 && (
          <Field label="Sources (optionnel)">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sources.map((s) => (
                <Checkbox
                  key={s.slug}
                  label={s.name}
                  checked={selectedSources.has(s.slug)}
                  onChange={() => toggleSource(s.slug)}
                />
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
              Aucune source cochée = toutes les sources. Priorité :
              brvm-org &gt; bfin &gt; sikafinance.
            </p>
          </Field>
        )}

        {/* Limit + Force */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--s4)',
            alignItems: 'end',
          }}
        >
          <Field label="Limit (max 500)">
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Checkbox
            label="Force : re-télécharger même si déjà archivé"
            checked={force}
            onChange={() => setForce(!force)}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || selectedTypes.size === 0}
          style={{
            padding: '12px 24px',
            background: loading ? 'rgba(197,160,40,.3)' : 'var(--admin-accent, #C5A028)',
            color: '#0F1117',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'var(--fb)',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {loading ? 'Téléchargement en cours…' : 'Lancer le téléchargement'}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: 'var(--s4) var(--s5)',
            marginBottom: 'var(--s6)',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 10,
            color: '#ff9b9b',
            fontSize: 13,
          }}
        >
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  )
}

/* ── Report view ────────────────────────────────────────────── */

function ReportView({ report }: { report: DownloadReport }) {
  const counts = report.counts
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        borderRadius: 12,
        padding: 'var(--s6)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 'var(--s4)',
        }}
      >
        Rapport de téléchargement
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--s3)',
          marginBottom: 'var(--s5)',
        }}
      >
        <Stat label="Matchés" value={report.total_matched} />
        <Stat label="Traités" value={report.total_processed} />
        <Stat label="✓ Téléchargés" value={counts.downloaded} accent="#8BE07A" />
        <Stat label="↷ Déjà archivés" value={counts.skipped_already_archived} accent="#4A90D9" />
        <Stat label="○ Sans URL" value={counts.skipped_no_pdf_url} accent="#B0B5C5" />
        <Stat label="⊘ Introuvables" value={counts.missing} accent="#ff9b9b" />
        <Stat label="✗ Erreurs" value={counts.error} accent="#ff9b9b" />
        <Stat label="Durée" value={`${(report.duration_ms / 1000).toFixed(1)}s`} />
      </div>

      <h3
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 'var(--s3)',
        }}
      >
        Détails par document
      </h3>

      <div
        style={{
          maxHeight: 500,
          overflowY: 'auto',
          border: '1px solid var(--admin-border)',
          borderRadius: 8,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--admin-bg)',
              zIndex: 1,
            }}
          >
            <tr>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Titre</th>
              <th style={thStyle}>Taille</th>
              <th style={thStyle}>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((item) => (
              <tr key={item.document_id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td style={tdStyle}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={tdStyle}>{item.doc_type}</td>
                <td style={tdStyle}>{item.doc_date ?? '—'}</td>
                <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </td>
                <td style={tdStyle}>{formatBytes(item.file_size)}</td>
                <td style={{ ...tdStyle, color: '#ff9b9b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.error ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
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
          letterSpacing: '.06em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: accent ?? 'var(--admin-text)',
          fontFamily: 'var(--fm)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: string; color: string }> = {
    downloaded: { icon: '✓', color: '#8BE07A' },
    skipped_already_archived: { icon: '↷', color: '#4A90D9' },
    skipped_no_pdf_url: { icon: '○', color: '#B0B5C5' },
    missing: { icon: '⊘', color: '#ff9b9b' },
    error: { icon: '✗', color: '#ff9b9b' },
  }
  const c = config[status] ?? { icon: '?', color: '#B0B5C5' }
  return (
    <span style={{ color: c.color, fontWeight: 700 }}>
      {c.icon} <span style={{ fontSize: 10, opacity: 0.8 }}>{status.replace(/_/g, ' ')}</span>
    </span>
  )
}

/* ── Form primitives ─────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  color: 'var(--admin-text)',
  fontFamily: 'var(--fb)',
  fontSize: 13,
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'var(--admin-text-muted)',
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: 'var(--admin-text-muted)',
  fontWeight: 700,
  borderBottom: '1px solid var(--admin-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--admin-text)',
  verticalAlign: 'top',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: checked ? 'rgba(197, 160, 40, 0.15)' : 'var(--admin-bg)',
        border: checked
          ? '1px solid var(--admin-accent, #C5A028)'
          : '1px solid var(--admin-border)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        color: checked ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text)',
        fontWeight: checked ? 600 : 400,
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ margin: 0, accentColor: '#C5A028' }}
      />
      {label}
    </label>
  )
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: 6,
        color: 'var(--admin-text-muted)',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
