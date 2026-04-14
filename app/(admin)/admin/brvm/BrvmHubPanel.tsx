'use client'

/**
 * Panneau central du Centre de Veille BRVM.
 *
 * Remplace :
 *  - l'ancien BrvmDocumentsPanel (tabs fixes + tri implicite)
 *  - l'ancien onglet Downloader séparé (fusion produit)
 *
 * Règles produit :
 *  - tri TOUJOURS décroissant (plus récent en haut)
 *  - filtre de période configurable (today / 7d / 30d / mois / custom / tout)
 *  - filtre multi-types (BOC coché par défaut mais pas exclusif)
 *  - filtre source (brvm-org > bfin > sikafinance)
 *  - actions inline : voir PDF source, archiver dans Storage, marquer traité
 *  - action globale : archiver tous les PDFs de la sélection courante
 */

import { useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'
import {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  type DocType,
} from '@/lib/brvm/types'
import { PERIOD_PRESETS, type PeriodPreset } from '@/lib/brvm/periods'

type Row = {
  id: string
  doc_type: DocType
  doc_type_label: string
  doc_date: string | null
  title: string
  source_name: string
  source_slug: string
  source_url: string
  pdf_url: string | null
  issuer_name: string | null
  is_new: boolean
  is_processed: boolean
  discovered_at: string
}

type Source = { slug: string; name: string }

type SortField = 'discovered_desc' | 'doc_date_desc' | 'type_then_date'

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'discovered_desc', label: 'Nouveauté (défaut)' },
  { value: 'doc_date_desc', label: 'Date publication' },
  { value: 'type_then_date', label: 'Type puis date' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function BrvmHubPanel({
  initialRows,
  initialTotal,
  sources,
}: {
  initialRows: Row[]
  initialTotal: number
  sources: Source[]
}) {
  // ── Filtres ──────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodPreset>('7d')
  const [customFrom, setCustomFrom] = useState<string>(todayISO())
  const [customTo, setCustomTo] = useState<string>(todayISO())
  const [selectedTypes, setSelectedTypes] = useState<Set<DocType>>(new Set())
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [status, setStatus] = useState<'all' | 'new' | 'unprocessed'>('all')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<SortField>('discovered_desc')

  // ── Données ──────────────────────────────────────────────
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [total, setTotal] = useState<number>(initialTotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Actions bulk (archive) ───────────────────────────────
  const [archiving, setArchiving] = useState(false)
  const [archiveReport, setArchiveReport] = useState<{
    total_matched: number
    counts: Record<string, number>
    duration_ms: number
  } | null>(null)

  const [processingId, setProcessingId] = useState<string | null>(null)

  // ── Chargement déclenché à chaque changement de filtre ───
  const queryString = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set('period', period)
    if (period === 'custom') {
      qs.set('period_from', customFrom)
      qs.set('period_to', customTo)
    }
    if (selectedTypes.size > 0) qs.set('doc_types', Array.from(selectedTypes).join(','))
    if (selectedSource) qs.set('source_slug', selectedSource)
    if (status === 'new') qs.set('is_new', 'true')
    if (status === 'unprocessed') qs.set('is_processed', 'false')
    if (search.trim()) qs.set('search', search.trim())
    qs.set('sort', sort)
    qs.set('limit', '200')
    return qs.toString()
  }, [period, customFrom, customTo, selectedTypes, selectedSource, status, search, sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/brvm/documents?${queryString}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok) {
          setRows(data.rows as Row[])
          setTotal(data.total as number)
        } else {
          setError(data.error ?? 'Erreur de chargement')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur réseau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [queryString])

  function toggleType(t: DocType) {
    const next = new Set(selectedTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setSelectedTypes(next)
  }

  async function markProcessed(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/brvm/documents/${id}/process`, { method: 'POST' })
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_new: false, is_processed: true } : r)),
        )
      }
    } finally {
      setProcessingId(null)
    }
  }

  async function archivePeriod() {
    setArchiving(true)
    setArchiveReport(null)
    try {
      // On reconstruit les bornes côté client depuis le preset
      const body: Record<string, unknown> = {
        limit: Math.min(total || 200, 500),
      }
      // Bornes déduites du preset courant
      const now = new Date()
      const today = todayISO()
      if (period === 'today') {
        body.date_from = today
        body.date_to = today
      } else if (period === '7d') {
        body.date_from = new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10)
        body.date_to = today
      } else if (period === '30d') {
        body.date_from = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10)
        body.date_to = today
      } else if (period === 'this_month') {
        body.date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        body.date_to = today
      } else if (period === 'custom') {
        body.date_from = customFrom
        body.date_to = customTo
      }
      if (selectedTypes.size > 0) body.doc_types = Array.from(selectedTypes)
      if (selectedSource) body.source_slugs = [selectedSource]

      const res = await fetch('/api/brvm/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok && data.report) {
        setArchiveReport({
          total_matched: data.report.total_matched,
          counts: data.report.counts,
          duration_ms: data.report.duration_ms,
        })
      } else {
        setError(data.error ?? 'Archivage échoué')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur archivage')
    } finally {
      setArchiving(false)
    }
  }

  const columns: Column<Row & Record<string, unknown>>[] = [
    {
      key: 'doc_type_label',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            background:
              row.doc_type === 'boc'
                ? 'rgba(197, 160, 40, 0.22)'
                : row.doc_type.startsWith('rapport_')
                  ? 'rgba(74, 144, 217, 0.15)'
                  : 'rgba(139, 224, 122, 0.12)',
            color:
              row.doc_type === 'boc'
                ? 'var(--admin-accent, #C5A028)'
                : row.doc_type.startsWith('rapport_')
                  ? 'var(--admin-info, #4A90D9)'
                  : '#8BE07A',
          }}
        >
          {row.doc_type_label}
        </span>
      ),
    },
    {
      key: 'doc_date',
      label: 'Date doc',
      sortable: true,
      render: (row) =>
        row.doc_date ? (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--admin-text)' }}>
            {row.doc_date}
          </span>
        ) : (
          <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
        ),
    },
    {
      key: 'title',
      label: 'Titre',
      sortable: true,
      render: (row) => (
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--admin-text)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.title}
          >
            {row.title}
          </div>
          {row.issuer_name && (
            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
              {row.issuer_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source_name',
      label: 'Source',
      render: (row) => (
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{row.source_name}</span>
      ),
    },
    {
      key: 'is_new',
      label: 'Statut',
      render: (row) => {
        if (row.is_processed) {
          return <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>✓ Traité</span>
        }
        if (row.is_new) {
          return (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(197, 160, 40, 0.2)',
                color: 'var(--admin-accent, #C5A028)',
                textTransform: 'uppercase',
              }}
            >
              Nouveau
            </span>
          )
        }
        return <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>—</span>
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              padding: '4px 8px',
              color: 'var(--admin-text-muted)',
              textDecoration: 'none',
              border: '1px solid var(--admin-border)',
              borderRadius: 6,
            }}
            title="Voir la source"
          >
            Source ↗
          </a>
          {row.pdf_url && (
            <a
              href={row.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'rgba(197, 160, 40, 0.15)',
                color: 'var(--admin-accent, #C5A028)',
                textDecoration: 'none',
                borderRadius: 6,
                border: '1px solid rgba(197, 160, 40, 0.3)',
                fontWeight: 600,
              }}
            >
              PDF ↗
            </a>
          )}
          {!row.is_processed && (
            <button
              onClick={() => markProcessed(row.id)}
              disabled={processingId === row.id}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'transparent',
                color: 'var(--admin-text-muted)',
                border: '1px solid var(--admin-border)',
                borderRadius: 6,
                cursor: processingId === row.id ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {processingId === row.id ? '…' : 'Traiter'}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* ═══ Filtres ═══ */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s5)',
          marginBottom: 'var(--s5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s4)',
        }}
      >
        {/* Période */}
        <div>
          <Label>Période</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIOD_PRESETS.map((p) => (
              <PillButton
                key={p.id}
                active={period === p.id}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </PillButton>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={inputStyle}
              />
              <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Types */}
        <div>
          <Label>Types de document</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PillButton active={selectedTypes.size === 0} onClick={() => setSelectedTypes(new Set())}>
              Tous
            </PillButton>
            {DOC_TYPES.map((t) => (
              <PillButton
                key={t}
                active={selectedTypes.has(t)}
                accent={t === 'boc'}
                onClick={() => toggleType(t)}
              >
                {DOC_TYPE_LABELS[t]}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Source + statut + tri + recherche */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <Label>Source</Label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              style={inputStyle}
            >
              <option value="">Toutes</option>
              {sources.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Statut</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'new' | 'unprocessed')}
              style={inputStyle}
            >
              <option value="all">Tous</option>
              <option value="new">Nouveautés</option>
              <option value="unprocessed">Non traités</option>
            </select>
          </div>

          <div>
            <Label>Tri</Label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortField)}
              style={inputStyle}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Recherche</Label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titre, émetteur, description…"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions globales */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--admin-border)',
            paddingTop: 'var(--s4)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {loading ? (
              <span>Chargement…</span>
            ) : (
              <span>
                <strong style={{ color: 'var(--admin-text)' }}>{total}</strong> document
                {total > 1 ? 's' : ''} · tri {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={archivePeriod}
            disabled={archiving || rows.length === 0}
            style={{
              padding: '8px 16px',
              background: archiving ? 'rgba(197,160,40,.3)' : 'var(--admin-accent, #C5A028)',
              color: '#0F1117',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--fb)',
              fontSize: 13,
              fontWeight: 700,
              cursor: archiving || rows.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Archive les PDFs dans Supabase Storage pour la sélection courante."
          >
            {archiving ? 'Archivage…' : '⇣ Archiver PDFs de la sélection'}
          </button>
        </div>
      </div>

      {/* Erreur éventuelle */}
      {error && (
        <div
          style={{
            padding: 'var(--s4)',
            marginBottom: 'var(--s4)',
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

      {archiveReport && (
        <div
          style={{
            padding: 'var(--s4) var(--s5)',
            marginBottom: 'var(--s4)',
            background: 'rgba(139, 224, 122, 0.08)',
            border: '1px solid rgba(139, 224, 122, 0.3)',
            borderRadius: 10,
            color: 'var(--admin-text)',
            fontSize: 13,
          }}
        >
          <strong>Archivage terminé</strong> — {archiveReport.total_matched} matchés,{' '}
          {archiveReport.counts?.downloaded ?? 0} téléchargés,{' '}
          {archiveReport.counts?.skipped_already_archived ?? 0} déjà archivés,{' '}
          {archiveReport.counts?.error ?? 0} erreurs. Durée{' '}
          {(archiveReport.duration_ms / 1000).toFixed(1)}s.
        </div>
      )}

      {/* Table */}
      <DataTable
        data={rows as (Row & Record<string, unknown>)[]}
        columns={columns}
        pageSize={25}
        searchKeys={['title', 'issuer_name', 'doc_type_label', 'source_name']}
        emptyMessage={
          loading
            ? 'Chargement…'
            : total === 0
              ? 'Aucun document ne correspond à votre sélection. Élargissez la période ou changez de type.'
              : 'Aucun document sur cette page.'
        }
      />
    </div>
  )
}

/* ── UI primitives ───────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        color: 'var(--admin-text-muted)',
        fontWeight: 600,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

function PillButton({
  active,
  onClick,
  children,
  accent = false,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  accent?: boolean
}) {
  const baseBg = accent ? 'rgba(197,160,40,.08)' : 'var(--admin-bg)'
  const activeBg = accent ? 'rgba(197,160,40,.22)' : 'rgba(197,160,40,.15)'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? activeBg : baseBg,
        border: active
          ? '1px solid var(--admin-accent, #C5A028)'
          : '1px solid var(--admin-border)',
        borderRadius: 999,
        color: active ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text)',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        fontFamily: 'var(--fb)',
      }}
    >
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  color: 'var(--admin-text)',
  fontFamily: 'var(--fb)',
  fontSize: 13,
  width: '100%',
}
