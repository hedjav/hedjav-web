'use client'

import { useState } from 'react'

export function BRVMTriggerButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleTrigger() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/brvm-trigger', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        if (data.skipped) {
          setResult(`Ignore : ${data.reason ?? 'Pas de donnees'}`)
        } else {
          setResult(`Article cree : ${data.article_title ?? 'OK'}`)
        }
      } else {
        setResult(`Erreur : ${data.error ?? 'Inconnue'}`)
      }
    } catch {
      setResult('Erreur reseau')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <button
        onClick={handleTrigger}
        disabled={loading}
        style={{
          background: loading ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
          color: '#0F1117',
          padding: 'var(--s3) var(--s5)',
          borderRadius: 'var(--r8)',
          fontFamily: 'var(--fb)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Veille en cours...' : 'Lancer une veille maintenant'}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.startsWith('Erreur') ? 'var(--admin-danger)' : 'var(--admin-success)' }}>
          {result}
        </span>
      )}
    </div>
  )
}
