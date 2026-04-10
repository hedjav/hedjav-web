'use client'

import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'

type Log = {
  id: string
  action: string
  prompt: string | null
  status: string
  tokens_used: number | null
  duration_ms: number | null
  created_at: string
  error_message: string | null
}

const logColumns: Column<Log>[] = [
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    ),
  },
  { key: 'action', label: 'Action', sortable: true },
  {
    key: 'prompt',
    label: 'Prompt',
    render: (row) => (
      <span style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.prompt?.substring(0, 50) ?? '\u2014'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Statut',
    render: (row) => (
      <span style={{
        padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
        background: row.status === 'success' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
        color: row.status === 'success' ? 'var(--admin-success)' : 'var(--admin-danger)',
      }}>
        {row.status}
      </span>
    ),
  },
  {
    key: 'tokens_used',
    label: 'Tokens',
    sortable: true,
    render: (row) => <span style={{ fontFamily: 'var(--fm)' }}>{row.tokens_used ?? '\u2014'}</span>,
  },
  {
    key: 'duration_ms',
    label: 'Duree',
    sortable: true,
    render: (row) => <span>{row.duration_ms != null ? `${row.duration_ms}ms` : '\u2014'}</span>,
  },
]

type ToolCard = {
  title: string
  desc: string
  status: string
  href?: string
}

const tools: ToolCard[] = [
  { title: 'Scoring qualite articles', desc: 'Analyser les articles existants et attribuer un score qualite (0-100).', status: 'Disponible', href: '/admin/ia/scoring' },
  { title: 'Veille BRVM automatique', desc: 'Resume quotidien des mouvements BRVM genere par IA.', status: 'Disponible', href: '/admin/brvm' },
  { title: 'Suggestions de sujets', desc: 'Proposer des idees d\'articles bases sur les tendances BRVM et patrimoine.', status: 'A venir' },
  { title: 'Generation de covers', desc: 'Creer des images de couverture SVG/PNG a partir du titre.', status: 'A venir' },
  { title: 'Chatbot patrimoine', desc: 'Assistant IA specialise patrimoine UEMOA pour les membres.', status: 'Phase 3' },
]

export function AiLogsClient({ logs }: { logs: Log[] }) {
  return (
    <>
      {/* Tool cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--s4)',
        marginBottom: 'var(--s8)',
      }}>
        {tools.map((tool) => {
          const inner = (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s2)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)', fontFamily: 'var(--fb)' }}>
                  {tool.title}
                </h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: tool.status === 'Disponible' ? 'rgba(34,197,94,.15)' : 'rgba(197,160,40,.12)',
                  color: tool.status === 'Disponible' ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {tool.status}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                {tool.desc}
              </p>
            </>
          )

          const cardStyle: React.CSSProperties = {
            background: 'var(--admin-surface)',
            borderRadius: 12,
            border: '1px solid var(--admin-border)',
            padding: 'var(--s5)',
            textDecoration: 'none',
            display: 'block',
            transition: 'border-color .15s',
          }

          if (tool.href) {
            return (
              <Link key={tool.title} href={tool.href} style={cardStyle}>
                {inner}
              </Link>
            )
          }

          return (
            <div key={tool.title} style={cardStyle}>
              {inner}
            </div>
          )
        })}
      </div>

      {/* Logs table */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: 'var(--admin-text)', marginBottom: 'var(--s4)' }}>
        Historique des appels IA
      </h2>
      <DataTable
        data={logs}
        columns={logColumns}
        searchKeys={['action', 'prompt']}
        emptyMessage="Aucun appel IA enregistre"
      />
    </>
  )
}
