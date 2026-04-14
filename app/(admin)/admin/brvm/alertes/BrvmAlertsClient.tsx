'use client'

import { useState } from 'react'

type Freq = 'daily' | 'weekly' | 'monthly'

type AlertLog = {
  id: string
  frequency: string
  period_from: string | null
  period_to: string | null
  document_count: number
  recipients_count: number
  status: string
  ai_provider: string | null
  error_message: string | null
  created_at: string
}

type DigestResult = {
  frequency: Freq
  ok: boolean
  period?: { from: string | null; to: string | null; label: string }
  total_documents?: number
  recipients?: number
  sent?: number
  failed?: number
  ai?: { enabled: boolean; available: boolean; provider: string | null }
  status?: string
  dry_run?: boolean
  duration_ms?: number
  error?: string
}

const FREQUENCIES: Array<{ id: Freq; label: string; hint: string }> = [
  { id: 'daily', label: 'Journalière', hint: 'Aujourd\u2019hui · envoyée chaque soir' },
  { id: 'weekly', label: 'Hebdomadaire', hint: '7 derniers jours · envoyée le vendredi' },
  { id: 'monthly', label: 'Mensuelle', hint: '30 derniers jours · envoyée le 1er du mois' },
]

export function BrvmAlertsClient({
  logs,
  aiAvailable,
  initialFrequencies,
}: {
  logs: AlertLog[]
  aiAvailable: boolean
  initialFrequencies: Record<Freq, boolean>
}) {
  // Multi-select : les 3 fréquences sont cochées par défaut.
  const [selected, setSelected] = useState<Record<Freq, boolean>>(() => ({
    daily: initialFrequencies.daily ?? true,
    weekly: initialFrequencies.weekly ?? true,
    monthly: initialFrequencies.monthly ?? true,
  }))
  const [useAi, setUseAi] = useState<boolean>(aiAvailable)
  const [loading, setLoading] = useState<'preview' | 'send' | null>(null)
  const [results, setResults] = useState<DigestResult[]>([])
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState<string | null>(null)

  const anySelected = Object.values(selected).some(Boolean)

  function toggleFrequency(freq: Freq) {
    setSelected((s) => ({ ...s, [freq]: !s[freq] }))
  }

  async function trigger(dryRun: boolean) {
    if (!anySelected) return
    setLoading(dryRun ? 'preview' : 'send')
    setResults([])
    const out: DigestResult[] = []
    const activeFreqs = (Object.keys(selected) as Freq[]).filter((f) => selected[f])
    for (const freq of activeFreqs) {
      try {
        const res = await fetch('/api/brvm/alerts/digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frequency: freq, dry_run: dryRun, ai: useAi }),
        })
        const data = (await res.json()) as Omit<DigestResult, 'frequency'>
        out.push({ frequency: freq, ...data })
      } catch (e) {
        out.push({ frequency: freq, ok: false, error: e instanceof Error ? e.message : 'Erreur réseau' })
      }
      setResults([...out])
    }
    setLoading(null)
  }

  async function saveConfig() {
    setSavingConfig(true)
    setConfigSaved(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'brvm_alert_frequencies',
          value: selected,
        }),
      })
      if (res.ok) {
        setConfigSaved('Préférences enregistrées.')
      } else {
        setConfigSaved('Erreur lors de l\u2019enregistrement.')
      }
    } catch {
      setConfigSaved('Erreur réseau.')
    } finally {
      setSavingConfig(false)
      setTimeout(() => setConfigSaved(null), 4000)
    }
  }

  return (
    <>
      {/* ── Configurateur ── */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s5)',
          marginBottom: 'var(--s6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s4)',
        }}
      >
        <div>
          <Label>Fréquences actives (toutes cochées par défaut)</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FREQUENCIES.map((f) => (
              <label
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: selected[f.id] ? 'rgba(197,160,40,.08)' : 'var(--admin-bg)',
                  border: selected[f.id] ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected[f.id]}
                  onChange={() => toggleFrequency(f.id)}
                  style={{ margin: 0, accentColor: '#C5A028' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)' }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                    {f.hint}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Analyse IA (facultative)</Label>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: useAi ? 'rgba(197,160,40,.12)' : 'var(--admin-bg)',
              border: useAi ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)',
              borderRadius: 999,
              cursor: aiAvailable ? 'pointer' : 'not-allowed',
              fontSize: 13,
              color: useAi ? 'var(--admin-accent)' : 'var(--admin-text)',
              opacity: aiAvailable ? 1 : 0.5,
            }}
          >
            <input
              type="checkbox"
              checked={useAi}
              disabled={!aiAvailable}
              onChange={() => setUseAi(!useAi)}
              style={{ margin: 0, accentColor: '#C5A028' }}
            />
            Inclure une note de synthèse IA
          </label>
          {!aiAvailable && (
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
              Aucun provider IA configuré. Renseignez <code>DEEPSEEK_API_KEY</code>,{' '}
              <code>OPENAI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code> dans{' '}
              <code>.env.local</code>.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            borderTop: '1px solid var(--admin-border)', paddingTop: 'var(--s4)',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => trigger(true)}
            disabled={loading !== null || !anySelected}
            style={secondaryBtn(loading === 'preview')}
          >
            {loading === 'preview' ? 'Chargement…' : '👁 Prévisualiser'}
          </button>
          <button
            type="button"
            onClick={() => trigger(false)}
            disabled={loading !== null || !anySelected}
            style={primaryBtn(loading === 'send')}
          >
            {loading === 'send' ? 'Envoi en cours…' : '✉ Envoyer aux admins'}
          </button>
          <button
            type="button"
            onClick={saveConfig}
            disabled={savingConfig}
            style={secondaryBtn(false)}
          >
            {savingConfig ? 'Enregistrement…' : '💾 Enregistrer les préférences'}
          </button>
          {configSaved && (
            <span style={{ fontSize: 12, color: 'var(--admin-success, #8BE07A)' }}>
              {configSaved}
            </span>
          )}
        </div>
      </div>

      {/* ── Résultats ── */}
      {results.length > 0 && (
        <div style={{ marginBottom: 'var(--s6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((r, i) => (
            <ResultCard key={`${r.frequency}-${i}`} result={r} />
          ))}
        </div>
      )}

      {/* ── Historique ── */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s5)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--admin-text)',
            marginBottom: 'var(--s4)',
          }}
        >
          Derniers digests ({logs.length})
        </h2>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
            Aucun digest enregistré. Les envois apparaîtront ici après le premier déclenchement
            (appliquer la migration <code>025_brvm_alerts.sql</code> si nécessaire).
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ResultCard({ result }: { result: DigestResult }) {
  const freqLabel = FREQUENCIES.find((f) => f.id === result.frequency)?.label ?? result.frequency
  return (
    <div
      style={{
        padding: 'var(--s4) var(--s5)',
        background: result.ok
          ? 'rgba(139, 224, 122, 0.08)'
          : 'rgba(231, 76, 60, 0.1)',
        border: result.ok
          ? '1px solid rgba(139, 224, 122, 0.3)'
          : '1px solid rgba(231, 76, 60, 0.3)',
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            background: 'rgba(197,160,40,.15)',
            color: 'var(--admin-accent)',
            textTransform: 'uppercase',
          }}
        >
          {freqLabel}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: result.ok ? '#8BE07A' : '#ff9b9b',
          }}
        >
          {result.ok
            ? result.dry_run
              ? 'Prévisualisation OK'
              : 'Digest envoyé'
            : 'Échec'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginLeft: 'auto' }}>
          {result.duration_ms ?? 0} ms
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--admin-text)' }}>
        {result.error ? (
          <span>Erreur : {result.error}</span>
        ) : (
          <>
            <strong>{result.total_documents ?? 0}</strong> document
            {(result.total_documents ?? 0) > 1 ? 's' : ''}
            {' · '}
            {result.recipients ?? 0} admin{(result.recipients ?? 0) > 1 ? 's' : ''} cible
            {(result.recipients ?? 0) > 1 ? 's' : ''}
            {!result.dry_run && (
              <> · {result.sent ?? 0} OK / {result.failed ?? 0} échec{(result.failed ?? 0) > 1 ? 's' : ''}</>
            )}
            {result.ai?.provider && <> · IA {result.ai.provider}</>}
            {result.period?.label && <> · {result.period.label}</>}
          </>
        )}
      </div>
    </div>
  )
}

function LogRow({ log }: { log: AlertLog }) {
  const statusColor: Record<string, string> = {
    success: '#8BE07A',
    partial: '#FFB84D',
    error: '#ff9b9b',
    empty: '#B0B5C5',
  }
  const color = statusColor[log.status] ?? '#B0B5C5'
  const date = new Date(log.created_at).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 140px 1fr 90px 100px',
        gap: 12,
        padding: '10px 12px',
        background: 'var(--admin-bg)',
        border: '1px solid var(--admin-border)',
        borderRadius: 8,
        fontSize: 12,
        alignItems: 'center',
      }}
      title={log.error_message ?? ''}
    >
      <span style={{ color, fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
        {log.status}
      </span>
      <span
        style={{
          color: 'var(--admin-text-muted)',
          textTransform: 'uppercase',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {log.frequency}
      </span>
      <span style={{ color: 'var(--admin-text)' }}>
        {log.document_count} doc{log.document_count > 1 ? 's' : ''} · {log.recipients_count} admin
        {log.recipients_count > 1 ? 's' : ''}
        {log.ai_provider ? ` · IA ${log.ai_provider}` : ''}
      </span>
      <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>
        {log.period_from && log.period_to
          ? log.period_from === log.period_to
            ? log.period_from
            : `${log.period_from}→${log.period_to}`
          : '—'}
      </span>
      <span style={{ color: 'var(--admin-text-muted)', textAlign: 'right', fontFamily: 'var(--fm)' }}>
        {date}
      </span>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em',
        color: 'var(--admin-text-muted)', fontWeight: 600, marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: busy ? 'rgba(197,160,40,.3)' : 'var(--admin-accent, #C5A028)',
    color: '#0F1117', border: 'none', borderRadius: 8,
    fontFamily: 'var(--fb)', fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
  }
}

function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: 'transparent', color: 'var(--admin-text)',
    border: '1px solid var(--admin-border)', borderRadius: 8,
    fontFamily: 'var(--fb)', fontSize: 13, fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
  }
}
