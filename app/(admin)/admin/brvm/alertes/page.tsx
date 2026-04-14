import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { BrvmSubNav } from '../BrvmSubNav'
import { BrvmAlertsClient } from './BrvmAlertsClient'
import { getAiStatus } from '@/lib/ai/client'

export const metadata: Metadata = { title: 'Admin — Alertes email BRVM' }
export const dynamic = 'force-dynamic'

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

async function getRecentAlerts(): Promise<AlertLog[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await db
      .from('brvm_alert_log')
      .select('id, frequency, period_from, period_to, document_count, recipients_count, status, ai_provider, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(25)
    return (data as AlertLog[] | null) ?? []
  } catch {
    // Migration 025 pas encore appliquée → liste vide, page toujours utilisable.
    return []
  }
}

export default async function BrvmAlertsPage() {
  const [logs, aiStatus] = await Promise.all([
    getRecentAlerts(),
    Promise.resolve(getAiStatus()),
  ])

  return (
    <>
      <BrvmSubNav />

      <div style={{ marginBottom: 'var(--s6)' }}>
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-4xl)',
            fontWeight: 600,
            color: 'var(--admin-text)',
          }}
        >
          Alertes email admin BRVM
        </h1>
        <p
          style={{
            color: 'var(--admin-text-muted)',
            fontSize: 'var(--text-sm)',
            marginTop: 4,
            maxWidth: 760,
          }}
        >
          Envoie à tous les administrateurs un digest structuré (tri décroissant, groupé par catégorie,
          liens directs vers PDFs et sources). Trois fréquences : journalière, hebdomadaire, mensuelle.
          Analyse IA facultative (DeepSeek priorisé, sinon OpenAI, sinon Anthropic).
        </p>
      </div>

      {/* État IA */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 999,
          marginBottom: 'var(--s5)',
          background: aiStatus.available
            ? 'rgba(139, 224, 122, 0.08)'
            : 'rgba(176, 181, 197, 0.08)',
          border: aiStatus.available
            ? '1px solid rgba(139, 224, 122, 0.35)'
            : '1px solid var(--admin-border)',
          fontSize: 12,
          color: aiStatus.available ? '#8BE07A' : 'var(--admin-text-muted)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: aiStatus.available ? '#8BE07A' : '#6B7280',
          }}
        />
        IA {aiStatus.available ? `active · ${aiStatus.provider}` : 'non configurée'}{' '}
        {aiStatus.providers.length > 1 && <>({aiStatus.providers.join(', ')})</>}
      </div>

      <BrvmAlertsClient logs={logs} aiAvailable={aiStatus.available} />

      <div
        style={{
          marginTop: 'var(--s8)',
          padding: 'var(--s4) var(--s5)',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--admin-text)',
            marginBottom: 8,
          }}
        >
          Automatiser avec un cron externe
        </h3>
        <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', lineHeight: 1.6 }}>
          Configure sur cron-job.org trois jobs distincts, auth{' '}
          <code style={{ background: 'var(--admin-bg)', padding: '2px 6px', borderRadius: 4 }}>
            Bearer INTERNAL_API_TOKEN
          </code>{' '}
          :
        </p>
        <pre
          style={{
            marginTop: 10,
            background: 'var(--admin-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: 'var(--admin-text)',
            overflowX: 'auto',
          }}
        >
          {`POST https://egp.hedjav.com/api/brvm/alerts/digest
body: { "frequency": "daily" }     // chaque jour 19h
body: { "frequency": "weekly" }    // chaque vendredi 18h
body: { "frequency": "monthly" }   // le 1er du mois 09h`}
        </pre>
      </div>
    </>
  )
}
