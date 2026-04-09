'use client'

import { DataTable, type Column } from '@/components/admin/DataTable'

type Invoice = {
  id: string
  invoice_number: string
  user_email: string
  user_name: string | null
  ebook_title: string
  amount: number
  currency: string
  status: string
  pdf_url: string | null
  created_at: string
}

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

const columns: Column<Invoice>[] = [
  {
    key: 'invoice_number',
    label: 'N. facture',
    sortable: true,
    render: (row) => (
      <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--admin-accent)' }}>
        {row.invoice_number}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.created_at).toLocaleDateString('fr-FR')}
      </span>
    ),
  },
  {
    key: 'user_name',
    label: 'Client',
    sortable: true,
    render: (row) => (
      <div>
        <div style={{ fontSize: 13 }}>{row.user_name ?? '\u2014'}</div>
        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{row.user_email}</div>
      </div>
    ),
  },
  { key: 'ebook_title', label: 'Ebook', sortable: true },
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
          row.status === 'refunded' ? 'rgba(245,158,11,.15)' :
          'rgba(239,68,68,.15)',
        color:
          row.status === 'paid' ? 'var(--admin-success)' :
          row.status === 'refunded' ? 'var(--admin-warning)' :
          'var(--admin-danger)',
      }}>
        {row.status}
      </span>
    ),
  },
  {
    key: 'pdf_url',
    label: 'PDF',
    render: (row) =>
      row.pdf_url ? (
        <a
          href={row.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '4px 10px',
            background: 'rgba(197,160,40,.15)',
            color: 'var(--admin-accent)',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Telecharger
        </a>
      ) : (
        <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>{'\u2014'}</span>
      ),
  },
]

export function FacturesClient({ invoices }: { invoices: Invoice[] }) {
  return (
    <DataTable
      data={invoices}
      columns={columns}
      searchKeys={['invoice_number', 'user_email', 'user_name']}
      emptyMessage="Aucune facture"
    />
  )
}
