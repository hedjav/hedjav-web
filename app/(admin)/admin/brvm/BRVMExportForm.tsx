'use client'

import { useState } from 'react'

const DATA_TYPES = [
  { value: 'boc_quotidien', label: 'Bulletins Officiels (BOC)' },
  { value: 'rapport_societe', label: 'Rapports sociétés' },
  { value: 'annonce_ag', label: 'Annonces AG' },
  { value: 'annonce_communique', label: 'Communiqués' },
  { value: 'annonce_esv', label: 'Événements valeurs' },
  { value: 'annonce_notation', label: 'Notations' },
  { value: 'avis_publication', label: 'Avis & publications' },
  { value: 'bulletin_mensuel', label: 'Bulletins mensuels' },
  { value: 'resume_seance', label: 'Résumés de séance' },
  { value: 'indices', label: 'Indices' },
  { value: 'cours_actions', label: 'Cours actions' },
]

type ExportDoc = {
  date: string
  title: string
  fileUrl: string | null
  sourceUrl: string | null
  hasPdf: boolean
  summary: string | null
}

type ExportCategory = {
  label: string
  documents: ExportDoc[]
}

type ExportResult = {
  ok: boolean
  stats: { totalDocuments: number; totalPdfs: number }
  categories: Record<string, ExportCategory>
  error?: string
}

export function BRVMExportForm() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  async function handleExport() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/brvm/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dataTypes: selectedTypes.length > 0 ? selectedTypes : undefined }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Erreur')
      } else {
        setResult(data)
      }
    } catch {
      setError('Erreur réseau')
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
      {/* Dates + bouton */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Date début
          </label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Date fin
          </label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            background: loading ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
            color: '#0F1117', padding: '8px 20px', borderRadius: 8,
            fontFamily: 'var(--fb)', fontSize: 13, fontWeight: 600,
            border: 'none', cursor: loading ? 'wait' : 'pointer', height: 38,
          }}
        >
          {loading ? 'Recherche...' : 'Rechercher les documents'}
        </button>
      </div>

      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DATA_TYPES.map((dt) => {
          const active = selectedTypes.includes(dt.value)
          return (
            <button
              key={dt.value}
              onClick={() => toggleType(dt.value)}
              style={{
                padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
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
          <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', alignSelf: 'center' }}>(tous les types)</span>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--admin-danger)', margin: 0 }}>{error}</p>}

      {/* Résultats : liste des PDFs par catégorie */}
      {result && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
            {result.stats.totalDocuments} documents trouvés dont <strong style={{ color: 'var(--admin-accent)' }}>{result.stats.totalPdfs} PDFs téléchargeables</strong>
          </p>

          {Object.entries(result.categories).map(([type, cat]) => {
            const pdfs = cat.documents.filter((d) => d.hasPdf)
            if (pdfs.length === 0 && !cat.documents.some((d) => d.summary)) return null

            return (
              <div key={type} style={{ marginBottom: 16, background: 'rgba(255,255,255,.02)', borderRadius: 8, padding: 12, border: '1px solid var(--admin-border)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text)', marginBottom: 8 }}>
                  {cat.label} ({cat.documents.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cat.documents.map((doc, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--admin-text)' }}>{doc.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginLeft: 8 }}>{doc.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: 'var(--admin-accent)', color: '#0F1117', textDecoration: 'none',
                            }}
                          >
                            Télécharger PDF
                          </a>
                        )}
                        {doc.sourceUrl && (
                          <a
                            href={doc.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'none' }}
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
