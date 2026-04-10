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
        const parts: string[] = []
        if (data.resume) parts.push('resume')
        if (data.cours_actions) parts.push(`${data.cours_actions} titres`)
        if (data.indices) parts.push(`${data.indices} indices`)
        if (data.boc) parts.push('BOC')
        if (data.annonces) parts.push(`${data.annonces} annonces`)
        if (data.ai_summary) parts.push('resume IA')
        setResult(parts.length > 0 ? `Collecte : ${parts.join(', ')}` : 'Veille terminee')
      } else if (data.skipped) {
        setResult(`Ignore : ${data.reason ?? 'Pas de donnees'}`)
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
        {loading ? 'Veille en cours...' : 'Lancer une veille'}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.startsWith('Erreur') ? 'var(--admin-danger)' : 'var(--admin-success)', maxWidth: 300, textAlign: 'right' }}>
          {result}
        </span>
      )}
    </div>
  )
}
