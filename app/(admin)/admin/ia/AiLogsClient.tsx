'use client'

import { useState } from 'react'

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
          background: '#1B2A4A',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,.08)',
          padding: 'var(--s6)',
          marginBottom: 'var(--s8)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: '#fff', marginBottom: 'var(--s4)' }}>
          Generer un article
        </h2>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#6B82B0', textTransform: 'uppercase', letterSpacing: '.15em', display: 'block', marginBottom: 4 }}>
              Sujet / brief
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Les 5 erreurs courantes en gestion de patrimoine UEMOA"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1B2A4A',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 8,
                color: '#E0E6EF',
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
              background: generating ? 'rgba(197,160,40,.3)' : '#C5A028',
              color: '#0D1628',
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
          <div style={{ marginTop: 'var(--s3)', fontSize: 13, color: genResult.startsWith('Erreur') ? '#ff9b9b' : '#5be58a' }}>
            {genResult}
          </div>
        )}
      </div>

      {/* Logs table */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: '#fff', marginBottom: 'var(--s4)' }}>
        Historique des appels IA
      </h2>
      <div style={{ background: '#1B2A4A', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Date</Th>
              <Th>Action</Th>
              <Th>Prompt</Th>
              <Th>Statut</Th>
              <Th>Tokens</Th>
              <Th>Duree</Th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
                  Aucun appel IA enregistre
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <Td>{new Date(l.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                  <Td>{l.action}</Td>
                  <Td>
                    <span style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.prompt?.substring(0, 50) ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: l.status === 'success' ? 'rgba(46,179,108,.15)' : 'rgba(255,80,80,.15)',
                      color: l.status === 'success' ? '#5be58a' : '#ff9b9b',
                    }}>
                      {l.status}
                    </span>
                  </Td>
                  <Td>{l.tokens_used ?? '—'}</Td>
                  <Td>{l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: 'var(--s4) var(--s5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: 'var(--s4) var(--s5)', fontSize: 13 }}>
      {children}
    </td>
  )
}
