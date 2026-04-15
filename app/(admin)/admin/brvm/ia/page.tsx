import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getAiStatus } from '@/lib/ai/client'
import { PageHeader } from '../_components/PageHeader'
import { BrvmAiClient } from './BrvmAiClient'

export const metadata: Metadata = { title: 'BRVM — Assistant IA' }
export const dynamic = 'force-dynamic'

type RecentLog = {
  id: string
  action: string
  model: string | null
  status: string | null
  duration_ms: number | null
  tokens_used: number | null
  created_at: string
}

async function getRecentBrvmAiLogs(): Promise<RecentLog[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await db
      .from('ai_logs')
      .select('id, action, model, status, duration_ms, tokens_used, created_at')
      .like('action', 'brvm_%')
      .order('created_at', { ascending: false })
      .limit(15)
    return (data as RecentLog[] | null) ?? []
  } catch {
    return []
  }
}

export default async function BrvmAiPage() {
  const [status, logs] = await Promise.all([
    Promise.resolve(getAiStatus()),
    getRecentBrvmAiLogs(),
  ])

  const providerBadgeColor = status.available ? '#1e5631' : '#B23A48'

  return (
    <>
      <PageHeader
        title="Assistant IA BRVM"
        subtitle="Couche d'exploitation éditoriale et analytique branchée sur les 4 univers BRVM. Prompts factorisés dans lib/brvm/ai/prompts/, contexte enrichi société / secteur / indice / période. Fallback heuristique quand l'IA n'est pas configurée (scoring uniquement)."
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { label: 'Assistant IA' },
        ]}
      />

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px',
          borderRadius: 999,
          background: `color-mix(in srgb, ${providerBadgeColor} 10%, transparent)`,
          color: providerBadgeColor,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 'var(--s5)',
          border: `1px solid ${providerBadgeColor}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: providerBadgeColor,
          }}
        />
        {status.available
          ? `Actif — provider prioritaire ${status.provider}${status.providers.length > 1 ? ` (fallback : ${status.providers.filter((p) => p !== status.provider).join(', ')})` : ''}`
          : 'IA non configurée — définir DEEPSEEK_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY'}
      </div>

      <BrvmAiClient aiAvailable={status.available} />

      {/* Historique compact */}
      <section style={{ marginTop: 'var(--s7)' }}>
        <h2
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--admin-text)',
            marginBottom: 'var(--s3)',
          }}
        >
          15 derniers appels IA BRVM
        </h2>
        {logs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
            Aucun appel IA BRVM enregistré pour l’instant. Lance une génération ci-dessus.
          </p>
        ) : (
          <div
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr
                  style={{
                    background: 'color-mix(in srgb, var(--admin-surface) 92%, black)',
                    fontSize: 11,
                    color: 'var(--admin-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                  }}
                >
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Use case</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Modèle</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Tokens</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Durée</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr
                    key={l.id}
                    style={{ borderTop: i > 0 ? '1px solid var(--admin-border)' : 'none' }}
                  >
                    <td
                      style={{
                        padding: '10px 16px',
                        fontFamily: 'var(--fm)',
                        fontSize: 12,
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      {new Date(l.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                      {l.action.replace(/^brvm_/, '')}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--fm)', fontSize: 11 }}>
                      {l.model ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--fm)',
                      }}
                    >
                      {l.tokens_used?.toLocaleString('fr-FR') ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--fm)',
                      }}
                    >
                      {l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: l.status === 'success' ? '#1e5631' : '#B23A48',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                        }}
                      >
                        {l.status ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
