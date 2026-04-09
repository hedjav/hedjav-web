'use client'

import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'

type Row = {
  id: string
  title: string
  slug: string
  price: number
  cover_image_url: string | null
  is_published: boolean
  is_featured: boolean
  created_at: string
  deleteAction: string
}

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

const columns: Column<Row>[] = [
  {
    key: 'cover_image_url',
    label: 'Cover',
    render: (row) =>
      row.cover_image_url ? (
        <img src={row.cover_image_url} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
      ) : (
        <div style={{ width: 40, height: 56, background: 'var(--admin-surface-hover)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--admin-text-muted)' }}>
          {'\uD83D\uDCD6'}
        </div>
      ),
  },
  {
    key: 'title',
    label: 'Titre',
    sortable: true,
    render: (row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{row.title}</div>
        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>/{row.slug}</div>
      </div>
    ),
  },
  {
    key: 'price',
    label: 'Prix',
    sortable: true,
    render: (row) => (
      <span style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>{formatFcfa(row.price)}</span>
    ),
  },
  {
    key: 'is_published',
    label: 'Statut',
    render: (row) => (
      <span style={{
        padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
        background: row.is_published ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.08)',
        color: row.is_published ? 'var(--admin-success)' : 'var(--admin-text-muted)',
      }}>
        {row.is_published ? 'Publie' : 'Brouillon'}
      </span>
    ),
  },
  {
    key: 'is_featured',
    label: 'Featured',
    render: (row) => row.is_featured ? (
      <span style={{ color: 'var(--admin-accent)', fontSize: 14 }}>{'\u2605'}</span>
    ) : (
      <span style={{ color: 'var(--admin-text-muted)' }}>{'\u2014'}</span>
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
    key: 'id',
    label: 'Actions',
    render: (row) => (
      <Link href={`/admin/ebooks/${row.id}`} style={{ color: 'var(--admin-accent)', fontSize: 12, fontWeight: 600 }}>
        Editer
      </Link>
    ),
  },
]

export function EbooksTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchKeys={['title', 'slug']}
      emptyMessage="Aucun ebook"
    />
  )
}
