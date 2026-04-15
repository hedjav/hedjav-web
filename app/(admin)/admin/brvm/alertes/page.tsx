import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { PageHeader } from '../_components/PageHeader'
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

type FreqConfig = { daily: boolean; weekly: boolean; monthly: boolean }

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getRecentAlerts(): Promise<AlertLog[]> {
  try {
    const { data } = await adminDb()
      .from('brvm_alert_log')
      .select('id, frequency, period_from, period_to, document_count, recipients_count, status, ai_provider, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(25)
    return (data as AlertLog[] | null) ?? []
  } catch {
    return []
  }
}

async function getFrequenciesConfig(): Promise<FreqConfig> {
  try {
    const { data } = await adminDb()
      .from('admin_settings')
      .select('value')
      .eq('key', 'brvm_alert_frequencies')
      .maybeSingle()
    const value = data?.value as Partial<FreqConfig> | null
    return {
      daily: value?.daily ?? true,
      weekly: value?.weekly ?? true,
      monthly: value?.monthly ?? true,
    }
  } catch {
    // Migration 026 pas appliquée : toutes les fréquences actives par défaut.
    return { daily: true, weekly: true, monthly: true }
  }
}

export default async function BrvmAlertsPage() {
  const [logs, aiStatus, freqs] = await Promise.all([
    getRecentAlerts(),
    Promise.resolve(getAiStatus()),
    getFrequenciesConfig(),
  ])

  return (
    <>
      <PageHeader
        title="Alertes email admin BRVM"
        subtitle="Trois fréquences coexistent et se cumulent : journalière, hebdomadaire, mensuelle. Chaque digest est structuré, groupé par catégorie, trié en ordre décroissant, avec liens directs vers les PDFs et les sources. Analyse IA optionnelle."
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { label: 'Alertes email' },
        ]}
      />

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
        IA {aiStatus.available ? `active · ${aiStatus.provider}` : 'non configurée'}
        {aiStatus.providers.length > 1 && <> ({aiStatus.providers.join(', ')})</>}
      </div>

      <BrvmAlertsClient
        logs={logs}
        aiAvailable={aiStatus.available}
        initialFrequencies={freqs}
      />

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
          Chaque digest est une route distincte. Configurer un job par fréquence active.
          Auth : <code style={{ background: 'var(--admin-bg)', padding: '2px 6px', borderRadius: 4 }}>
            Bearer INTERNAL_API_TOKEN
          </code>.
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
body: { "frequency": "daily" }     // chaque jour 19h UTC
body: { "frequency": "weekly" }    // chaque vendredi 18h UTC
body: { "frequency": "monthly" }   // le 1er du mois 09h UTC`}
        </pre>
      </div>
    </>
  )
}
