'use client'

import { useState } from 'react'

export function GenerateButton({ campaignId, position, hasContent }: { campaignId: string; position: number; hasContent: boolean }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/campaigns/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${prompt('Token API interne :')}`,
        },
        body: JSON.stringify({ campaign_id: campaignId, position }),
      })
      const data = await res.json()
      if (data.subject) {
        setResult(`OK: ${data.subject}`)
        window.location.reload()
      } else {
        setResult(`Err: ${data.error ?? 'Erreur'}`)
      }
    } catch {
      setResult('Err: Erreur reseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
      <button
        onClick={generate}
        disabled={loading}
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          background: hasContent ? 'rgba(255,255,255,.08)' : 'var(--admin-accent)',
          color: hasContent ? 'var(--admin-text)' : '#0F1117',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? 'Generation...' : hasContent ? 'Regenerer IA' : 'Generer IA'}
      </button>
      {result && <span style={{ fontSize: '11px', color: result.startsWith('OK') ? '#4ade80' : '#ff6b6b' }}>{result}</span>}
    </div>
  )
}
