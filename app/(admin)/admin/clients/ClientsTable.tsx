'use client'

import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'

type Row = {
  id: string
  full_name: string
  email: string
  country: string
  nb_achats: number
  ca_total: number
  newsletter: boolean
  created_at: string
}

function formatFcfa(n: number) {
  if (n === 0) return '\u2014'
  return new Intl.NumberFormat('fr-FR').format(n) + ' F'
}

const columns: Column<Row>[] = [
  {
    key: 'full_name',
    label: 'Nom',
    sortable: true,
    render: (row) => (
      <Link href={`/admin/clients/${row.id}`} style={{ color: 'var(--admin-text)', fontWeight: 600, fontSize: 13 }}>
        {row.full_name || '\u2014'}
      </Link>
    ),
  },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'country', label: 'Pays', sortable: true },
  {
    key: 'nb_achats',
    label: 'Nb achats',
    sortable: true,
    render: (row) => (
      <span style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>{row.nb_achats}</span>
    ),
  },
  {
    key: 'ca_total',
    label: 'CA total',
    sortable: true,
    render: (row) => (
      <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: row.ca_total > 0 ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>
        {formatFcfa(row.ca_total)}
      </span>
    ),
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    render: (row) => (
      <span
        style={{
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: row.newsletter ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)',
          color: row.newsletter ? 'var(--admin-success)' : 'var(--admin-text-muted)',
        }}
      >
        {row.newsletter ? 'Oui' : 'Non'}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Inscrit le',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.created_at).toLocaleDateString('fr-FR')}
      </span>
    ),
  },
]

export function ClientsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchKeys={['full_name', 'email', 'country']}
      emptyMessage="Aucun client"
    />
  )
}
