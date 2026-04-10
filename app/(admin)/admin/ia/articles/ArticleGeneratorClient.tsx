'use client'

import { useState } from 'react'

const CATEGORIES = [
  'BRVM',
  'Patrimoine',
  'IA & productivite',
  'Immobilier',
  'Entrepreneuriat',
  'Finance personnelle',
]

export function ArticleGeneratorClient() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ title?: string; excerpt?: string; error?: string } | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || generating) return
    setGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          instructions: instructions.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ title: data.title, excerpt: data.excerpt })
        setSubject('')
        setInstructions('')
      } else {
        setResult({ error: data.error ?? 'Erreur inconnue' })
      }
    } catch {
      setResult({ error: 'Erreur reseau' })
    }
    setGenerating(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    color: 'var(--admin-text)',
    fontFamily: 'var(--fb)',
    fontSize: 13,
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    marginBottom: 4,
    fontSize: 11,
    color: 'var(--admin-accent)',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '.1em',
  }

  return (
    <>
      <div style={{
        background: 'var(--admin-surface)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid var(--admin-border)',
        maxWidth: 700,
        marginBottom: 'var(--s8)',
      }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          <div>
            <label style={labelStyle}>Sujet de l&apos;article</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Les 5 erreurs courantes en gestion de patrimoine UEMOA"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Categorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Instructions supplementaires (optionnel)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Inclure des exemples concrets du Benin et du Senegal, citer des chiffres recents..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={generating || !subject.trim()}
            style={{
              alignSelf: 'flex-start',
              background: generating ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
              color: '#0F1117',
              padding: 'var(--s3) var(--s6)',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: 14,
              fontFamily: 'var(--fb)',
              cursor: generating ? 'wait' : 'pointer',
            }}
          >
            {generating ? 'Generation en cours...' : 'Generer l\'article'}
          </button>
        </form>
      </div>

      {/* Result preview */}
      {result && (
        <div style={{
          background: 'var(--admin-surface)',
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${result.error ? 'rgba(239,68,68,.3)' : 'var(--admin-border)'}`,
          maxWidth: 700,
        }}>
          {result.error ? (
            <div style={{ color: 'var(--admin-danger)', fontSize: 13 }}>
              Erreur : {result.error}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--admin-success)', fontWeight: 600, marginBottom: 8 }}>
                Article cree en brouillon
              </div>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: 'var(--admin-text)', marginBottom: 8 }}>
                {result.title}
              </h3>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                {result.excerpt}
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}
