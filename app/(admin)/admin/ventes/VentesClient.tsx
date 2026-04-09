'use client'

import { useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'

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

const columns: Column<Row>[] = [
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    ),
  },
  {
    key: 'clientName',
    label: 'Client',
    sortable: true,
    render: (row) => (
      <div>
        <div style={{ fontSize: 13 }}>{row.clientName ?? '\u2014'}</div>
        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{row.email}</div>
      </div>
    ),
  },
  { key: 'ebook', label: 'Ebook', sortable: true },
  {
    key: 'amount',
    label: 'Montant',
    sortable: true,
    render: (row) => (
      <span style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>{formatFcfa(row.amount)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Statut',
    render: (row) => (
      <span style={{
        padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
        background:
          row.status === 'paid' ? 'rgba(34,197,94,.15)' :
          row.status === 'pending' ? 'rgba(245,158,11,.15)' :
          'rgba(239,68,68,.15)',
        color:
          row.status === 'paid' ? 'var(--admin-success)' :
          row.status === 'pending' ? 'var(--admin-warning)' :
          'var(--admin-danger)',
      }}>
        {row.status}
      </span>
    ),
  },
  {
    key: 'invoice',
    label: 'Facture',
    render: (row) =>
      row.invoice?.url ? (
        <a href={row.invoice.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-accent)', fontSize: 11, textDecoration: 'underline' }}>
          {row.invoice.number}
        </a>
      ) : (
        <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>{'\u2014'}</span>
      ),
  },
]

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
            background: 'var(--admin-accent)',
            color: '#0F1117',
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
      <DataTable
        data={rows}
        columns={columns}
        searchKeys={['clientName', 'email', 'ebook']}
        emptyMessage="Aucune vente"
      />
    </>
  )
}
