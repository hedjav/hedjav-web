'use client'

import { useState } from 'react'
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

export function AiLogsClient({ logs }: { logs: Log[] }) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [genResult, setGenResult] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() || generating) return
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setGenResult(`Article cree : ${data.title ?? 'OK'}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setGenResult(`Erreur : ${data.error ?? res.statusText}`)
      }
    } catch (err) {
      setGenResult(`Erreur : ${err instanceof Error ? err.message : 'unknown'}`)
    }
    setGenerating(false)
  }

  return (
    <>
      {/* Generate article form */}
      <div
        style={{
          background: 'var(--admin-surface)',
          borderRadius: 12,
          border: '1px solid var(--admin-border)',
          padding: 'var(--s6)',
          marginBottom: 'var(--s8)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: 'var(--admin-text)', marginBottom: 'var(--s4)' }}>
          Generer un article
        </h2>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.15em', display: 'block', marginBottom: 4 }}>
              Sujet / brief
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Les 5 erreurs courantes en gestion de patrimoine UEMOA"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--admin-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 8,
                color: 'var(--admin-text)',
                fontSize: 13,
                fontFamily: 'var(--fb)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={generating || !topic.trim()}
            style={{
              padding: '10px 20px',
              background: generating ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
              color: '#0F1117',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              fontFamily: 'var(--fb)',
              cursor: generating ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {generating ? 'Generation...' : 'Generer'}
          </button>
        </form>
        {genResult && (
          <div style={{ marginTop: 'var(--s3)', fontSize: 13, color: genResult.startsWith('Erreur') ? 'var(--admin-danger)' : 'var(--admin-success)' }}>
            {genResult}
          </div>
        )}
      </div>

      {/* Tool cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--s4)',
        marginBottom: 'var(--s8)',
      }}>
        {[
          { title: 'Generation newsletter', desc: 'Generer et envoyer la newsletter hebdo via Claude API + Resend.', status: 'Disponible' },
          { title: 'Scoring qualite articles', desc: 'Analyser les articles existants et attribuer un score qualite (0-100).', status: 'A venir' },
          { title: 'Suggestions de sujets', desc: 'Proposer des idees d\'articles bases sur les tendances BRVM et patrimoine.', status: 'A venir' },
          { title: 'Veille BRVM automatique', desc: 'Resume quotidien des mouvements BRVM genere par IA.', status: 'A venir' },
          { title: 'Generation de covers', desc: 'Creer des images de couverture SVG/PNG a partir du titre.', status: 'A venir' },
          { title: 'Chatbot patrimoine', desc: 'Assistant IA specialise patrimoine UEMOA pour les membres.', status: 'Phase 3' },
        ].map((tool) => (
          <div
            key={tool.title}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 12,
              border: '1px solid var(--admin-border)',
              padding: 'var(--s5)',
            }}
          >
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
          </div>
        ))}
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
