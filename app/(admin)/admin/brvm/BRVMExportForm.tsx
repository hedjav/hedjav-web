'use client'

import { useState } from 'react'

const DATA_TYPES = [
  { value: 'resume_seance', label: 'Resume seance' },
  { value: 'cours_actions', label: 'Cours actions' },
  { value: 'indices', label: 'Indices' },
  { value: 'boc_quotidien', label: 'BOC' },
  { value: 'annonce', label: 'Annonces' },
  { value: 'rapport_societe', label: 'Rapports' },
]

export function BRVMExportForm() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  async function handleExport() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brvm/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          dataTypes: selectedTypes,
          format: 'excel',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erreur')
        setLoading(false)
        return
      }

      // Download the file
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BRVM_${startDate}_${endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Erreur reseau')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,.05)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--admin-text)',
    fontFamily: 'var(--fb)',
    fontSize: 13,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Date debut
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Date fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            background: loading ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
            color: '#0F1117',
            padding: '8px 20px',
            borderRadius: 8,
            fontFamily: 'var(--fb)',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            height: 38,
          }}
        >
          {loading ? 'Export...' : 'Telecharger Excel'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DATA_TYPES.map((dt) => {
          const active = selectedTypes.includes(dt.value)
          return (
            <button
              key={dt.value}
              onClick={() => toggleType(dt.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--fb)',
                border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: active ? 'rgba(197,160,40,.15)' : 'transparent',
                color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                cursor: 'pointer',
              }}
            >
              {dt.label}
            </button>
          )
        })}
        {selectedTypes.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', alignSelf: 'center' }}>
            (tous les types)
          </span>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--admin-danger)', margin: 0 }}>{error}</p>
      )}
    </div>
  )
}
