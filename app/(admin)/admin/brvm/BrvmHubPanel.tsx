'use client'

/**
 * Panneau central du Centre de Veille BRVM — refonte produit iceberg.
 *
 * Inspirations : RichBourse (navigation par société), SikaFinance (catégories
 * éditoriales claires), BRVM officielle (classification par indice + secteur).
 *
 * Règles produit :
 *  - tri TOUJOURS décroissant (plus récent en haut)
 *  - filtre de période configurable (today / 7d / 30d / mois / custom / tout)
 *  - pas d'onglet BOC autonome (le BOC reste juste un type parmi d'autres)
 *  - navigation éditoriale : Nouveautés / Société / Secteur / Indice / Archives
 *  - badges stables (pas d'artefact visuel au refresh)
 *  - actions inline : voir PDF source, archiver dans Storage, marquer traité
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
  issuer_slug: string | null
  issuer_name: string | null
  sector: string | null
  market_index: string | null
  is_new: boolean
  is_processed: boolean
  discovered_at: string
}

type Source = { slug: string; name: string }

type SortField = 'discovered_desc' | 'doc_date_desc' | 'type_then_date'
type HubView = 'news' | 'issuer' | 'sector' | 'index' | 'archives'

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'discovered_desc', label: 'Nouveauté (défaut)' },
  { value: 'doc_date_desc', label: 'Date publication' },
  { value: 'type_then_date', label: 'Type puis date' },
]

const HUB_VIEWS: Array<{ id: HubView; label: string; hint: string }> = [
  { id: 'news', label: 'Toutes les nouveautés', hint: 'Flux chronologique, tri décroissant' },
  { id: 'issuer', label: 'Par société', hint: 'Regroupé par émetteur coté' },
  { id: 'sector', label: 'Par secteur', hint: 'Banque, télécom, agri, industrie…' },
  { id: 'index', label: 'Par indice', hint: 'Composite, BRVM 30, Prestige…' },
  { id: 'archives', label: 'Archives', hint: 'Par année, téléchargements massifs' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/* Badge de type document : rendu stable (pas d'artefact visuel entre SSR et hydration). */
function DocTypeBadge({ docType, label }: { docType: DocType; label: string }) {
  const theme = typeTheme(docType)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        background: theme.bg,
        color: theme.color,
        lineHeight: 1.4,
        minWidth: 52,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function typeTheme(docType: DocType): { bg: string; color: string } {
  if (docType === 'boc') return { bg: 'rgba(197, 160, 40, 0.22)', color: 'var(--admin-accent, #C5A028)' }
  if (docType.startsWith('rapport_')) return { bg: 'rgba(74, 144, 217, 0.15)', color: 'var(--admin-info, #4A90D9)' }
  if (docType === 'communique' || docType === 'note_information') return { bg: 'rgba(139, 224, 122, 0.12)', color: '#8BE07A' }
  if (docType === 'avis') return { bg: 'rgba(180, 122, 224, 0.15)', color: '#B47AE0' }
  if (docType === 'annonce') return { bg: 'rgba(255, 184, 77, 0.12)', color: '#FFB84D' }
  return { bg: 'rgba(176, 181, 197, 0.12)', color: 'var(--admin-text-muted)' }
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
  const [view, setView] = useState<HubView>('news')

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

  // Vue "archives" impose une période large par défaut (30j)
  useEffect(() => {
    if (view === 'archives' && period !== 'all' && period !== '30d') {
      setPeriod('all')
    }
  }, [view, period])

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
    qs.set('limit', view === 'archives' ? '500' : '200')
    return qs.toString()
  }, [period, customFrom, customTo, selectedTypes, selectedSource, status, search, sort, view])

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
      const body: Record<string, unknown> = {
        limit: Math.min(total || 200, 500),
      }
      const now = new Date()
      const today = todayISO()
      if (period === 'today') {
        body.date_from = today; body.date_to = today
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
        body.date_from = customFrom; body.date_to = customTo
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

  // Regroupement côté client pour les vues 'issuer' / 'sector' / 'index'
  const grouped = useMemo(() => {
    if (view === 'news' || view === 'archives') return null
    const keyOf = (r: Row): string => {
      if (view === 'issuer') return r.issuer_name ?? r.issuer_slug ?? '(Sans émetteur)'
      if (view === 'sector') return r.sector ?? '(Secteur non renseigné)'
      if (view === 'index') return r.market_index ?? '(Indice non renseigné)'
      return '(inconnu)'
    }
    const map = new Map<string, Row[]>()
    for (const r of rows) {
      const k = keyOf(r)
      const arr = map.get(k) ?? []
      arr.push(r)
      map.set(k, arr)
    }
    // Tri : groupes avec le plus de docs d'abord, puis alpha
    return Array.from(map.entries()).sort((a, b) => {
      const lenDiff = b[1].length - a[1].length
      if (lenDiff !== 0) return lenDiff
      return a[0].localeCompare(b[0], 'fr')
    })
  }, [rows, view])

  const columns: Column<Row & Record<string, unknown>>[] = [
    {
      key: 'doc_type_label',
      label: 'Type',
      sortable: true,
      render: (row) => <DocTypeBadge docType={row.doc_type} label={row.doc_type_label} />,
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
        <div style={{ maxWidth: 440 }}>
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
              {row.sector ? ` · ${row.sector}` : ''}
              {row.market_index ? ` · ${row.market_index}` : ''}
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
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(197, 160, 40, 0.2)',
                color: 'var(--admin-accent, #C5A028)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
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
              fontSize: 11, padding: '4px 8px',
              color: 'var(--admin-text-muted)', textDecoration: 'none',
              border: '1px solid var(--admin-border)', borderRadius: 6,
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
                fontSize: 11, padding: '4px 10px',
                background: 'rgba(197, 160, 40, 0.15)', color: 'var(--admin-accent, #C5A028)',
                textDecoration: 'none', borderRadius: 6,
                border: '1px solid rgba(197, 160, 40, 0.3)', fontWeight: 600,
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
                fontSize: 11, padding: '4px 10px',
                background: 'transparent', color: 'var(--admin-text-muted)',
                border: '1px solid var(--admin-border)', borderRadius: 6,
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
      {/* ═══ Navigation éditoriale (tabs principales) ═══ */}
      <div
        style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          marginBottom: 'var(--s4)',
          paddingBottom: 12,
          borderBottom: '1px solid var(--admin-border)',
        }}
      >
        {HUB_VIEWS.map((v) => {
          const active = v.id === view
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              title={v.hint}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: active ? 'rgba(197,160,40,.12)' : 'transparent',
                borderBottom: active ? '2px solid var(--admin-accent, #C5A028)' : '2px solid transparent',
                color: active ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text-muted)',
                fontFamily: 'var(--fb)',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

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
        <div>
          <Label>Période</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIOD_PRESETS.map((p) => (
              <PillButton key={p.id} active={period === p.id} onClick={() => setPeriod(p.id)}>
                {p.label}
              </PillButton>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
              <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>

        <div>
          <Label>Catégorie documentaire</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PillButton active={selectedTypes.size === 0} onClick={() => setSelectedTypes(new Set())}>
              Toutes
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <Label>Source</Label>
            <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} style={inputStyle}>
              <option value="">Toutes</option>
              {sources.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Statut</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'new' | 'unprocessed')} style={inputStyle}>
              <option value="all">Tous</option>
              <option value="new">Nouveautés</option>
              <option value="unprocessed">Non traités</option>
            </select>
          </div>
          <div>
            <Label>Tri</Label>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortField)} style={inputStyle}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
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

        <div
          style={{
            display: 'flex', gap: 12, alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap',
            borderTop: '1px solid var(--admin-border)', paddingTop: 'var(--s4)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {loading ? (
              <span>Chargement…</span>
            ) : (
              <span>
                <strong style={{ color: 'var(--admin-text)' }}>{total}</strong> document{total > 1 ? 's' : ''}
                {view !== 'news' && grouped && <> · {grouped.length} groupe{grouped.length > 1 ? 's' : ''}</>}
                {' · '}tri {SORT_OPTIONS.find((o) => o.value === sort)?.label}
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
              color: '#0F1117', border: 'none', borderRadius: 8,
              fontFamily: 'var(--fb)', fontSize: 13, fontWeight: 700,
              cursor: archiving || rows.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Archive les PDFs dans Supabase Storage pour la sélection courante."
          >
            {archiving ? 'Archivage…' : '⇣ Archiver PDFs de la sélection'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--s4)', marginBottom: 'var(--s4)',
            background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 10, color: '#ff9b9b', fontSize: 13,
          }}
        >
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {archiveReport && (
        <div
          style={{
            padding: 'var(--s4) var(--s5)', marginBottom: 'var(--s4)',
            background: 'rgba(139, 224, 122, 0.08)', border: '1px solid rgba(139, 224, 122, 0.3)',
            borderRadius: 10, color: 'var(--admin-text)', fontSize: 13,
          }}
        >
          <strong>Archivage terminé</strong> — {archiveReport.total_matched} matchés,{' '}
          {archiveReport.counts?.downloaded ?? 0} téléchargés,{' '}
          {archiveReport.counts?.skipped_already_archived ?? 0} déjà archivés,{' '}
          {archiveReport.counts?.error ?? 0} erreurs.
          Durée {(archiveReport.duration_ms / 1000).toFixed(1)}s.
        </div>
      )}

      {/* ═══ Affichage selon la vue ═══ */}
      {view === 'news' && (
        <DataTable
          data={rows as (Row & Record<string, unknown>)[]}
          columns={columns}
          pageSize={25}
          searchKeys={['title', 'issuer_name', 'doc_type_label', 'source_name']}
          emptyMessage={loading ? 'Chargement…' : total === 0
            ? 'Aucun document ne correspond à votre sélection. Élargissez la période ou changez de type.'
            : 'Aucun document sur cette page.'}
        />
      )}

      {view !== 'news' && view !== 'archives' && grouped && (
        <GroupedListView groups={grouped} columns={columns} loading={loading} view={view} />
      )}

      {view === 'archives' && (
        <ArchivesView rows={rows} loading={loading} />
      )}
    </div>
  )
}

/* ── Vue groupée (Par société / secteur / indice) ── */

function GroupedListView({
  groups,
  columns,
  loading,
  view,
}: {
  groups: Array<[string, Row[]]>
  columns: Column<Row & Record<string, unknown>>[]
  loading: boolean
  view: HubView
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.slice(0, 3).map(([k]) => k)))

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Chargement…</div>
  }
  if (groups.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucun document sur la période. Élargissez les filtres.</div>
  }

  const viewLabel = view === 'issuer' ? 'Société' : view === 'sector' ? 'Secteur' : 'Indice'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map(([key, docs]) => {
        const isOpen = open.has(key)
        return (
          <div
            key={key}
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => {
                const n = new Set(open)
                if (n.has(key)) n.delete(key); else n.add(key)
                setOpen(n)
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--fb)',
              }}
            >
              <span
                style={{
                  fontSize: 10, color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700,
                }}
              >
                {viewLabel}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)', flex: 1 }}>
                {key}
              </span>
              <span
                style={{
                  fontSize: 12, color: 'var(--admin-accent)',
                  background: 'rgba(197,160,40,.1)',
                  padding: '2px 10px', borderRadius: 999, fontWeight: 600,
                }}
              >
                {docs.length} document{docs.length > 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--admin-text-muted)', fontSize: 16 }}>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                <DataTable
                  data={docs as (Row & Record<string, unknown>)[]}
                  columns={columns}
                  pageSize={15}
                  searchKeys={['title', 'doc_type_label']}
                  emptyMessage="Aucun document."
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Vue Archives : résumé par année ── */

function ArchivesView({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const byYear = useMemo(() => {
    const map = new Map<string, { count: number; archived: number; byType: Record<string, number> }>()
    for (const r of rows) {
      const date = r.doc_date ?? r.discovered_at.slice(0, 10)
      const year = date.slice(0, 4)
      const entry = map.get(year) ?? { count: 0, archived: 0, byType: {} }
      entry.count++
      entry.byType[r.doc_type] = (entry.byType[r.doc_type] ?? 0) + 1
      map.set(year, entry)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Chargement…</div>
  }
  if (byYear.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        Aucun document archivé sur la sélection. Élargissez la période.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 14 }}>
        Archives classées par année (décroissant). Utilisez le bouton « Archiver PDFs » ci-dessus pour télécharger les PDFs manquants vers Supabase Storage.
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {byYear.map(([year, info]) => (
          <div
            key={year}
            style={{
              padding: 'var(--s4) var(--s5)',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em',
                color: 'var(--admin-text-muted)', fontWeight: 700, marginBottom: 8,
              }}
            >
              Année
            </div>
            <div
              style={{
                fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 600,
                color: 'var(--admin-accent)', lineHeight: 1,
              }}
            >
              {year}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--admin-text)' }}>
              <strong>{info.count}</strong> documents
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(info.byType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([type, n]) => (
                  <span
                    key={type}
                    style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 999, background: 'rgba(255,255,255,.06)',
                      color: 'var(--admin-text-muted)', textTransform: 'uppercase',
                    }}
                  >
                    {(DOC_TYPE_LABELS as Record<string, string>)[type] ?? type}: {n}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── UI primitives ── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em',
        color: 'var(--admin-text-muted)', fontWeight: 600, marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

function PillButton({
  active, onClick, children, accent = false,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; accent?: boolean
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
        border: active ? '1px solid var(--admin-accent, #C5A028)' : '1px solid var(--admin-border)',
        borderRadius: 999,
        color: active ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text)',
        fontSize: 12, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: 'var(--fb)',
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
