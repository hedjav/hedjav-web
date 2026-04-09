'use client'

import { DataTable, type Column } from '@/components/admin/DataTable'

type Row = {
  id: string
  email: string
  first_name: string
  phone: string
  source: string
  is_active: boolean
  subscribed_at: string
}

function sourceBadge(source: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    editorial: { bg: 'rgba(59,130,246,.15)', color: 'var(--admin-info)' },
    lead_magnet: { bg: 'rgba(197,160,40,.15)', color: 'var(--admin-accent)' },
    both: { bg: 'rgba(34,197,94,.15)', color: 'var(--admin-success)' },
  }
  const s = colors[source] ?? { bg: 'rgba(255,255,255,.06)', color: 'var(--admin-text-muted)' }
  return (
    <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {source}
    </span>
  )
}

const columns: Column<Row>[] = [
  { key: 'email', label: 'Email', sortable: true },
  { key: 'first_name', label: 'Prenom', sortable: true },
  {
    key: 'source',
    label: 'Type',
    render: (row) => sourceBadge(row.source),
  },
  { key: 'phone', label: 'Telephone' },
  {
    key: 'subscribed_at',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.subscribed_at).toLocaleDateString('fr-FR')}
      </span>
    ),
  },
  {
    key: 'is_active',
    label: 'Actif',
    render: (row) => (
      <span
        style={{
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: row.is_active ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
          color: row.is_active ? 'var(--admin-success)' : 'var(--admin-danger)',
        }}
      >
        {row.is_active ? 'Actif' : 'Inactif'}
      </span>
    ),
  },
]

export function NewsletterTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchKeys={['email', 'first_name', 'source']}
      emptyMessage="Aucun abonne"
    />
  )
}
