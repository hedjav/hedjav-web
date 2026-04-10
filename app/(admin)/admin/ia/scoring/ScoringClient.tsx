'use client'

import { useState } from 'react'

type Article = {
  id: string
  title: string
  category: string
  source: string
  quality_score: number | null
  is_published: boolean
  created_at: string
}

function scoreBadge(score: number | null) {
  if (score == null) {
    return (
      <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: 'var(--admin-text-muted)' }}>
        --
      </span>
    )
  }
  const bg = score < 40 ? 'rgba(239,68,68,.15)' : score < 70 ? 'rgba(245,158,11,.15)' : 'rgba(34,197,94,.15)'
  const color = score < 40 ? 'var(--admin-danger)' : score < 70 ? 'var(--admin-warning)' : 'var(--admin-success)'
  return (
    <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--fm)', background: bg, color }}>
      {score}
    </span>
  )
}

export function ScoringClient({ articles: initial }: { articles: Article[] }) {
  const [articles, setArticles] = useState(initial)
  const [scoring, setScoring] = useState<Record<string, boolean>>({})
  const [scoringAll, setScoringAll] = useState(false)

  async function scoreOne(id: string) {
    setScoring((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/articles/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: id }),
      })
      const data = await res.json()
      if (data.ok) {
        setArticles((prev) =>
          prev.map((a) => a.id === id ? { ...a, quality_score: data.score } : a),
        )
      }
    } catch { /* ignore */ }
    setScoring((prev) => ({ ...prev, [id]: false }))
  }

  async function scoreAll() {
    setScoringAll(true)
    try {
      const res = await fetch('/api/articles/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = await res.json()
      if (data.ok && data.results) {
        const scoreMap = new Map(
          (data.results as Array<{ id: string; score: number }>).map((r) => [r.id, r.score]),
        )
        setArticles((prev) =>
          prev.map((a) => {
            const s = scoreMap.get(a.id)
            return s != null ? { ...a, quality_score: s } : a
          }),
        )
      }
    } catch { /* ignore */ }
    setScoringAll(false)
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={scoreAll}
          disabled={scoringAll}
          style={{
            background: scoringAll ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
            color: '#0F1117',
            padding: 'var(--s3) var(--s5)',
            borderRadius: 'var(--r8)',
            fontFamily: 'var(--fb)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            border: 'none',
            cursor: scoringAll ? 'wait' : 'pointer',
          }}
        >
          {scoringAll ? 'Scoring en cours...' : 'Scorer tous les articles'}
        </button>
      </div>

      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Titre', 'Categorie', 'Source', 'Score', 'Statut', 'Action'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.title}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12 }}>{a.category}</td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: a.source === 'ai' ? 'rgba(197,160,40,.15)' : 'rgba(59,130,246,.15)',
                    color: a.source === 'ai' ? 'var(--admin-accent)' : 'var(--admin-info)',
                  }}>
                    {a.source}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>{scoreBadge(a.quality_score)}</td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: a.is_published ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)',
                    color: a.is_published ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                  }}>
                    {a.is_published ? 'Publie' : 'Brouillon'}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <button
                    onClick={() => scoreOne(a.id)}
                    disabled={scoring[a.id] || scoringAll}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: scoring[a.id] ? 'wait' : 'pointer',
                      background: 'rgba(197,160,40,.15)',
                      color: 'var(--admin-accent)',
                      opacity: scoring[a.id] || scoringAll ? 0.5 : 1,
                      fontFamily: 'var(--fb)',
                    }}
                  >
                    {scoring[a.id] ? '...' : 'Scorer'}
                  </button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucun article</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
