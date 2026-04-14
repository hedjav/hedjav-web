'use client'

import { useMemo, useState } from 'react'

type Log = {
  id: string
  action: string
  prompt: string | null
  result: string | null
  model: string | null
  status: string
  tokens_used: number | null
  duration_ms: number | null
  created_at: string
  error_message: string | null
  created_by: string | null
  metadata: Record<string, unknown> | null
}

type StatusFilter = 'all' | 'success' | 'skipped' | 'warning' | 'error'
type GroupMode = 'none' | 'action'

const ACTION_LABELS: Record<string, string> = {
  article_generation: 'Génération article',
  article_scoring: 'Scoring article',
  brvm_daily_summary: 'BRVM — résumé quotidien',
  brvm_weekly_digest: 'BRVM — digest hebdo',
  brvm_digest_daily: 'BRVM — digest journalier',
  brvm_digest_weekly: 'BRVM — digest hebdomadaire',
  brvm_digest_monthly: 'BRVM — digest mensuel',
  brvm_article_auto: 'BRVM — article auto',
  campaign_generate_email: 'Campagne — email',
  newsletter_weekly_send: 'Newsletter hebdo',
  generate_text: 'Génération texte',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function AiLogsClient({ logs, actions }: { logs: Log[]; actions: string[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupMode>('action')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let out = logs
    if (statusFilter !== 'all') out = out.filter((l) => l.status === statusFilter)
    if (actionFilter) out = out.filter((l) => l.action === actionFilter)
    if (search.trim()) {
      const s = search.toLowerCase()
      out = out.filter(
        (l) =>
          l.action.toLowerCase().includes(s) ||
          (l.error_message ?? '').toLowerCase().includes(s) ||
          (l.model ?? '').toLowerCase().includes(s),
      )
    }
    return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [logs, statusFilter, actionFilter, search])

  const grouped = useMemo(() => {
    if (group === 'none') return null
    const map = new Map<string, Log[]>()
    for (const l of filtered) {
      const arr = map.get(l.action) ?? []
      arr.push(l)
      map.set(l.action, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered, group])

  function toggle(id: string) {
    const n = new Set(expanded)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setExpanded(n)
  }

  return (
    <>
      {/* ── Filtres ── */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s5)',
          marginBottom: 'var(--s5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <Label>Statut</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'success', 'skipped', 'warning', 'error'] as StatusFilter[]).map((s) => (
              <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} color={statusColor(s)}>
                {statusFilterLabel(s)}
              </Pill>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <Label>Action métier</Label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={inputStyle}>
              <option value="">Toutes les actions ({actions.length})</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {actionLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Regroupement</Label>
            <select value={group} onChange={(e) => setGroup(e.target.value as GroupMode)} style={inputStyle}>
              <option value="none">Liste chronologique</option>
              <option value="action">Grouper par action (défaut)</option>
            </select>
          </div>
          <div>
            <Label>Recherche</Label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Action, modèle, message d'erreur…"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
          <strong style={{ color: 'var(--admin-text)' }}>{filtered.length}</strong> appel
          {filtered.length > 1 ? 's' : ''} · {logs.length} au total sur la période affichée
        </div>
      </div>

      {/* ── Liste ── */}
      {group === 'none' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? <Empty /> : filtered.map((l) => <LogRow key={l.id} log={l} expanded={expanded.has(l.id)} onToggle={() => toggle(l.id)} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(grouped ?? []).length === 0 ? <Empty /> : (grouped ?? []).map(([action, items]) => <GroupedBlock key={action} action={action} items={items} expanded={expanded} onToggle={toggle} />)}
        </div>
      )}
    </>
  )
}

function GroupedBlock({
  action, items, expanded, onToggle,
}: {
  action: string; items: Log[]; expanded: Set<string>; onToggle: (id: string) => void
}) {
  const success = items.filter((i) => i.status === 'success').length
  const errors = items.filter((i) => i.status === 'error').length
  const skipped = items.filter((i) => i.status === 'skipped').length
  const lastAt = items[0]?.created_at
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
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--admin-border)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
            color: 'var(--admin-text-muted)', fontWeight: 700,
          }}
        >
          Action
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)', flex: 1 }}>
          {actionLabel(action)} <code style={{ fontSize: 11, color: 'var(--admin-text-muted)', background: 'var(--admin-bg)', padding: '1px 6px', borderRadius: 4 }}>{action}</code>
        </span>
        <MiniCount label="OK" value={success} color="#8BE07A" />
        <MiniCount label="Err" value={errors} color="#ff6b6b" />
        {skipped > 0 && <MiniCount label="Skip" value={skipped} color="var(--admin-text-muted)" />}
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
          {lastAt ? new Date(lastAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.slice(0, 10).map((l) => (
          <LogRow key={l.id} log={l} expanded={expanded.has(l.id)} onToggle={() => onToggle(l.id)} />
        ))}
        {items.length > 10 && (
          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', paddingTop: 4 }}>
            + {items.length - 10} autres appels plus anciens sur cette action
          </div>
        )}
      </div>
    </div>
  )
}

function LogRow({ log, expanded, onToggle }: { log: Log; expanded: boolean; onToggle: () => void }) {
  const [main, ...providerRest] = (log.model ?? '').split(':')
  const provider = providerRest.length > 0 ? main : ''
  const model = providerRest.length > 0 ? providerRest.join(':') : log.model ?? ''

  return (
    <div
      style={{
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '110px 140px 1fr 80px 70px 70px',
          gap: 10,
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          alignItems: 'center',
          fontFamily: 'var(--fb)',
        }}
      >
        <StatusBadge status={log.status} />
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'var(--fm)' }}>
          {new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--admin-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={log.error_message ?? ''}
        >
          {log.error_message
            ? <span style={{ color: '#ff9b9b' }}>{log.error_message}</span>
            : provider
              ? <>{provider}:<span style={{ color: 'var(--admin-text-muted)' }}>{model}</span></>
              : model || '—'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'var(--fm)' }}>
          {log.duration_ms != null ? `${log.duration_ms} ms` : '—'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontFamily: 'var(--fm)' }}>
          {log.tokens_used ?? '—'} tk
        </span>
        <span style={{ fontSize: 11, color: 'var(--admin-accent)', fontWeight: 600, textAlign: 'right' }}>
          {expanded ? 'Fermer' : 'Détail'}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--admin-border)',
            background: 'var(--admin-surface)',
            fontSize: 12,
            color: 'var(--admin-text)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {log.prompt && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Prompt
              </div>
              <pre style={preStyle}>{log.prompt}</pre>
            </div>
          )}
          {log.result && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Réponse
              </div>
              <pre style={preStyle}>{log.result.slice(0, 2000)}</pre>
              {log.result.length > 2000 && (
                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                  … (réponse tronquée à 2000 caractères)
                </div>
              )}
            </div>
          )}
          {log.error_message && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#ff9b9b', marginBottom: 4, fontWeight: 600 }}>
                Erreur
              </div>
              <pre style={{ ...preStyle, color: '#ff9b9b' }}>{log.error_message}</pre>
            </div>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Métadonnées
              </div>
              <pre style={preStyle}>{JSON.stringify(log.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status)
  const label = status === 'success' ? 'SUCCÈS' : status === 'error' ? 'ERREUR' : status === 'warning' ? 'WARN' : status === 'skipped' ? 'SKIP' : status.toUpperCase()
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.08em',
        background: `${color}22`,
        color,
        textAlign: 'center',
      }}
    >
      {label}
    </span>
  )
}

function MiniCount({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <span style={{ color }}>{label}</span>
      <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{value}</span>
    </span>
  )
}

function Empty() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
      Aucun appel IA ne correspond à ces filtres.
    </div>
  )
}

function statusColor(status: string): string {
  switch (status) {
    case 'success': return '#8BE07A'
    case 'error': return '#ff6b6b'
    case 'warning': return '#FFB84D'
    case 'skipped': return '#B0B5C5'
    default: return 'var(--admin-text-muted)'
  }
}

function statusFilterLabel(s: StatusFilter): string {
  switch (s) {
    case 'all': return 'Tous'
    case 'success': return 'Succès'
    case 'skipped': return 'Skipped'
    case 'warning': return 'Warnings'
    case 'error': return 'Erreurs'
  }
}

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

function Pill({
  active, onClick, children, color,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? `${color}22` : 'var(--admin-bg)',
        border: active ? `1px solid ${color}` : '1px solid var(--admin-border)',
        borderRadius: 999,
        color: active ? color : 'var(--admin-text)',
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

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 10,
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 6,
  fontSize: 11,
  lineHeight: 1.5,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 260,
}
