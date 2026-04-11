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
        // Nouveau shape /api/brvm/scrape : { boc:{new}, rapports:{new}, annonces:{new}, market:{cours,indices} }
        const boc = data.boc as { new?: number } | undefined
        const rapports = data.rapports as { new?: number } | undefined
        const annonces = data.annonces as { new?: number } | undefined
        const market = data.market as { cours?: number; indices?: number; resume?: boolean } | undefined

        const parts: string[] = []
        if (boc?.new) parts.push(`${boc.new} BOC`)
        if (rapports?.new) parts.push(`${rapports.new} rapports`)
        if (annonces?.new) parts.push(`${annonces.new} annonces`)
        if (market?.cours) parts.push(`${market.cours} titres`)
        if (market?.indices) parts.push(`${market.indices} indices`)

        setResult(
          parts.length > 0
            ? `✓ ${parts.join(', ')}`
            : 'Veille terminée — rien de nouveau depuis le dernier run'
        )
        // Recharge la page pour voir les nouveaux documents
        if (parts.length > 0) setTimeout(() => window.location.reload(), 1500)
      } else {
        // Affiche l'erreur ET le hint si dispo (cas des migrations manquantes)
        const hint = data.hint ? ` — ${data.hint}` : ''
        setResult(`Erreur : ${data.error ?? 'Inconnue'}${hint}`)
      }
    } catch {
      setResult('Erreur réseau')
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
