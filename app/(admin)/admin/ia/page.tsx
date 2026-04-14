import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { AiLogsClient } from './AiLogsClient'

export const metadata: Metadata = { title: 'Admin — Outils IA' }
export const dynamic = 'force-dynamic'

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

type Stats = {
  total_calls: number
  success: number
  skipped: number
  warning: number
  errors: number
  total_tokens: number
  avg_duration_ms: number
  success_rate: number
  actions: string[]
}

async function getStats(): Promise<{ stats: Stats; logs: Log[] }> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // On charge 200 logs détaillés pour les calculs précis + l'UI.
  const logsResult = await db
    .from('ai_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const logs = (logsResult.data ?? []) as Log[]
  const monthLogs = logs.filter((l) => l.created_at >= startOfMonth)

  const success = monthLogs.filter((l) => l.status === 'success').length
  const skipped = monthLogs.filter((l) => l.status === 'skipped').length
  const warning = monthLogs.filter((l) => l.status === 'warning').length
  const errors = monthLogs.filter((l) => l.status === 'error').length

  const durations = monthLogs
    .map((l) => l.duration_ms)
    .filter((d): d is number => typeof d === 'number' && d > 0)
  const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const totalTokens = monthLogs.reduce((sum, l) => sum + ((l.tokens_used as number) ?? 0), 0)

  const actionsSet = new Set<string>()
  for (const l of logs) if (l.action) actionsSet.add(l.action)

  const rate = monthLogs.length > 0 ? Math.round((success / monthLogs.length) * 100) : 0

  return {
    stats: {
      total_calls: monthLogs.length,
      success,
      skipped,
      warning,
      errors,
      total_tokens: totalTokens,
      avg_duration_ms: Math.round(avg),
      success_rate: rate,
      actions: Array.from(actionsSet).sort(),
    },
    logs,
  }
}

export default async function AdminIAPage() {
  const { stats, logs } = await getStats()

  const cards: Array<{ label: string; value: string; accent: string; hint?: string }> = [
    {
      label: 'Appels ce mois',
      value: stats.total_calls.toLocaleString('fr-FR'),
      accent: 'var(--admin-info, #4A90D9)',
      hint: `${stats.actions.length} action${stats.actions.length > 1 ? 's' : ''} distinctes`,
    },
    {
      label: 'Taux de succès',
      value: `${stats.success_rate}%`,
      accent: stats.success_rate >= 90 ? '#8BE07A' : stats.success_rate >= 70 ? '#FFB84D' : '#ff6b6b',
      hint: `${stats.success} OK / ${stats.errors} erreurs`,
    },
    {
      label: 'Skipped (IA absente)',
      value: stats.skipped.toLocaleString('fr-FR'),
      accent: 'var(--admin-text-muted)',
      hint: stats.skipped > 0 ? 'Vérifier les clés .env' : 'Aucun',
    },
    {
      label: 'Erreurs',
      value: stats.errors.toLocaleString('fr-FR'),
      accent: stats.errors > 0 ? '#ff6b6b' : 'var(--admin-text-muted)',
      hint: stats.warning > 0 ? `${stats.warning} warning` : undefined,
    },
    {
      label: 'Tokens consommés',
      value: stats.total_tokens.toLocaleString('fr-FR'),
      accent: 'var(--admin-accent, #C5A028)',
    },
    {
      label: 'Latence moyenne',
      value: stats.avg_duration_ms > 0 ? `${(stats.avg_duration_ms / 1000).toFixed(1)} s` : '—',
      accent: 'var(--admin-text)',
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 'var(--s6)' }}>
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-4xl)',
            fontWeight: 600,
            color: 'var(--admin-text)',
          }}
        >
          Logs IA
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', marginTop: 4, fontSize: 'var(--text-sm)', maxWidth: 760 }}>
          Vue d&apos;exploitation complète des appels IA : statuts, provider/modèle, latence,
          tokens, erreurs. Les appels sont regroupés par action métier. Tri toujours décroissant.
        </p>
      </div>

      {/* ═══ KPIs ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s4)',
          marginBottom: 'var(--s6)',
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 12,
              border: '1px solid var(--admin-border)',
              padding: 'var(--s5)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--admin-text-muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--fm)',
                fontSize: 'var(--text-2xl)',
                color: c.accent,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {c.value}
            </div>
            {c.hint && (
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>
                {c.hint}
              </div>
            )}
          </div>
        ))}
      </div>

      <AiLogsClient logs={logs} actions={stats.actions} />
    </>
  )
}
