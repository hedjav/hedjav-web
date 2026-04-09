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
        setResult(`✓ ${data.subject}`)
        window.location.reload()
      } else {
        setResult(`✗ ${data.error ?? 'Erreur'}`)
      }
    } catch {
      setResult('✗ Erreur réseau')
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
          background: hasContent ? 'rgba(255,255,255,.08)' : '#C5A028',
          color: hasContent ? '#E0E6EF' : '#fff',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? 'Génération...' : hasContent ? 'Regénérer IA' : 'Générer IA'}
      </button>
      {result && <span style={{ fontSize: '11px', color: result.startsWith('✓') ? '#4ade80' : '#ff6b6b' }}>{result}</span>}
    </div>
  )
}
