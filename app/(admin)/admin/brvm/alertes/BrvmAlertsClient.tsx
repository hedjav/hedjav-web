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
  ok: boolean
  frequency: string
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

export function BrvmAlertsClient({
  logs,
  aiAvailable,
}: {
  logs: AlertLog[]
  aiAvailable: boolean
}) {
  const [frequency, setFrequency] = useState<Freq>('daily')
  const [useAi, setUseAi] = useState<boolean>(aiAvailable)
  const [loading, setLoading] = useState<'preview' | 'send' | null>(null)
  const [result, setResult] = useState<DigestResult | null>(null)

  async function trigger(dryRun: boolean) {
    setLoading(dryRun ? 'preview' : 'send')
    setResult(null)
    try {
      const res = await fetch('/api/brvm/alerts/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, dry_run: dryRun, ai: useAi }),
      })
      const data = (await res.json()) as DigestResult
      setResult(data)
    } catch (e) {
      setResult({
        ok: false,
        frequency,
        error: e instanceof Error ? e.message : 'Erreur réseau',
      })
    } finally {
      setLoading(null)
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
          <Label>Fréquence</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(
              [
                { value: 'daily', label: 'Journalière (aujourd\'hui)' },
                { value: 'weekly', label: 'Hebdomadaire (7 j)' },
                { value: 'monthly', label: 'Mensuelle (30 j)' },
              ] as Array<{ value: Freq; label: string }>
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                style={pillStyle(frequency === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Analyse IA</Label>
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
              <code>.env.local</code> puis redéployez.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            borderTop: '1px solid var(--admin-border)',
            paddingTop: 'var(--s4)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => trigger(true)}
            disabled={loading !== null}
            style={secondaryBtn(loading === 'preview')}
          >
            {loading === 'preview' ? 'Chargement…' : '👁 Prévisualiser (dry-run)'}
          </button>
          <button
            type="button"
            onClick={() => trigger(false)}
            disabled={loading !== null}
            style={primaryBtn(loading === 'send')}
          >
            {loading === 'send' ? 'Envoi…' : '✉ Envoyer maintenant aux admins'}
          </button>
        </div>
      </div>

      {/* ── Résultat ── */}
      {result && (
        <div
          style={{
            padding: 'var(--s5)',
            marginBottom: 'var(--s6)',
            background: result.ok
              ? 'rgba(139, 224, 122, 0.08)'
              : 'rgba(231, 76, 60, 0.1)',
            border: result.ok
              ? '1px solid rgba(139, 224, 122, 0.3)'
              : '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 18,
              fontWeight: 600,
              color: result.ok ? '#8BE07A' : '#ff9b9b',
              marginBottom: 8,
            }}
          >
            {result.ok
              ? result.dry_run
                ? 'Prévisualisation OK'
                : 'Digest envoyé'
              : 'Échec'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--admin-text)', lineHeight: 1.7 }}>
            {result.error ? (
              <div>Erreur : {result.error}</div>
            ) : (
              <>
                <div>
                  <strong>Période :</strong> {result.period?.label ?? '—'}
                </div>
                <div>
                  <strong>Documents :</strong> {result.total_documents ?? 0}
                </div>
                <div>
                  <strong>Destinataires :</strong> {result.recipients ?? 0} admin
                  {(result.recipients ?? 0) > 1 ? 's' : ''}
                </div>
                {!result.dry_run && (
                  <div>
                    <strong>Envoi :</strong> {result.sent ?? 0} OK · {result.failed ?? 0} échec
                    {(result.failed ?? 0) > 1 ? 's' : ''}
                  </div>
                )}
                <div>
                  <strong>IA :</strong>{' '}
                  {result.ai?.provider
                    ? `oui · ${result.ai.provider}`
                    : result.ai?.enabled
                      ? 'demandée mais skippée (pas de clé)'
                      : 'désactivée'}
                </div>
                <div>
                  <strong>Durée :</strong> {result.duration_ms ?? 0} ms
                </div>
              </>
            )}
          </div>
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
            (ou après application de la migration{' '}
            <code>025_brvm_alerts.sql</code>).
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

function LogRow({ log }: { log: AlertLog }) {
  const statusColor: Record<string, string> = {
    success: '#8BE07A',
    partial: '#FFB84D',
    error: '#ff9b9b',
    empty: '#B0B5C5',
  }
  const color = statusColor[log.status] ?? '#B0B5C5'
  const date = new Date(log.created_at).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
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

/* ── UI primitives ── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        color: 'var(--admin-text-muted)',
        fontWeight: 600,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: active ? 'rgba(197,160,40,.18)' : 'var(--admin-bg)',
    border: active ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)',
    borderRadius: 999,
    color: active ? 'var(--admin-accent)' : 'var(--admin-text)',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    fontFamily: 'var(--fb)',
  }
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: busy ? 'rgba(197,160,40,.3)' : 'var(--admin-accent, #C5A028)',
    color: '#0F1117',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'var(--fb)',
    fontSize: 13,
    fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
  }
}

function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: 'transparent',
    color: 'var(--admin-text)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    fontFamily: 'var(--fb)',
    fontSize: 13,
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
  }
}
