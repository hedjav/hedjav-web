import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { AiLogsClient } from './AiLogsClient'

export const metadata: Metadata = { title: 'Admin — Outils IA' }

async function getStats() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [allMonth, successMonth, logsResult] = await Promise.all([
    db.from('ai_logs').select('tokens_used', { count: 'exact' }).gte('created_at', startOfMonth),
    db.from('ai_logs').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth).eq('status', 'success'),
    db.from('ai_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const totalCalls = allMonth.count ?? 0
  const successCalls = successMonth.count ?? 0
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0
  const totalTokens = (allMonth.data ?? []).reduce((sum, r) => sum + ((r.tokens_used as number) ?? 0), 0)

  return {
    totalCalls,
    totalTokens,
    successRate,
    logs: (logsResult.data ?? []) as Array<{
      id: string
      action: string
      prompt: string | null
      status: string
      tokens_used: number | null
      duration_ms: number | null
      created_at: string
      error_message: string | null
    }>,
  }
}

export default async function AdminIAPage() {
  const stats = await getStats()

  const statCards = [
    { label: 'Appels ce mois', value: stats.totalCalls.toString(), color: '#60a5fa' },
    { label: 'Tokens consommes', value: stats.totalTokens.toLocaleString('fr-FR'), color: '#C5A028' },
    { label: 'Taux de succes', value: `${stats.successRate}%`, color: '#5be58a' },
  ]

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s4)' }}>
        Outils IA
      </h1>
      <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 'var(--s8)', maxWidth: 720 }}>
        Suivi des appels Claude API, logs et generation de contenu.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s5)', marginBottom: 'var(--s10)' }}>
        {statCards.map((c) => (
          <div
            key={c.label}
            style={{
              background: '#1B2A4A',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,.08)',
              padding: 'var(--s6)',
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', color: '#6B82B0', marginBottom: 'var(--s2)' }}>
              {c.label}
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 'var(--text-3xl)', color: c.color, fontWeight: 700 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <AiLogsClient logs={stats.logs} />
    </>
  )
}
