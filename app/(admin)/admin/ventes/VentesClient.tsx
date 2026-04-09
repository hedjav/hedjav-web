'use client'

import { useState } from 'react'

type Row = {
  id: string
  date: string
  clientName: string | null
  email: string
  ebook: string
  amount: number
  status: string
  invoice: { number: string; url: string | null } | null
}

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export function VentesClient({ rows }: { rows: Row[] }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/ventes/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ventes-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Export failed', e)
    }
    setExporting(false)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--s4)' }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '8px 16px',
            background: '#C5A028',
            color: '#0D1628',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            fontFamily: 'var(--fb)',
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? 'Export...' : 'Exporter CSV'}
        </button>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Ebook</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
              <Th>Facture</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <Td>{new Date(p.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                <Td>
                  <div style={{ fontSize: 13 }}>{p.clientName ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{p.email}</div>
                </Td>
                <Td>{p.ebook}</Td>
                <Td style={{ fontFamily: 'var(--fm)' }}>{formatFcfa(p.amount)}</Td>
                <Td>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      p.status === 'paid' ? 'rgba(46,179,108,.15)' :
                      p.status === 'pending' ? 'rgba(255,200,0,.15)' :
                      'rgba(255,80,80,.15)',
                    color:
                      p.status === 'paid' ? '#5be58a' :
                      p.status === 'pending' ? '#ffd966' :
                      '#ff9b9b',
                  }}>
                    {p.status}
                  </span>
                </Td>
                <Td>
                  {p.invoice?.url ? (
                    <a
                      href={p.invoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#C5A028', fontSize: 11, textDecoration: 'underline' }}
                    >
                      {p.invoice.number}
                    </a>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>—</span>
                  )}
                </Td>
              </tr>
            ))}
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

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: 'var(--s4) var(--s5)', fontSize: 13, ...style }}>
      {children}
    </td>
  )
}
