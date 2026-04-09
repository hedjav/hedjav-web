'use client'

import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/DataTable'

type Row = {
  id: string
  title: string
  slug: string
  category: string
  source: string
  quality_score: number | null
  is_published: boolean
  created_at: string
}

const columns: Column<Row>[] = [
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
    key: 'category',
    label: 'Categorie',
    sortable: true,
    render: (row) => <span style={{ fontSize: 12 }}>{row.category || '\u2014'}</span>,
  },
  {
    key: 'source',
    label: 'Source',
    render: (row) => (
      <span style={{
        padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
        background: row.source === 'ai' ? 'rgba(139,92,246,.15)' : 'rgba(59,130,246,.15)',
        color: row.source === 'ai' ? '#a78bfa' : 'var(--admin-info)',
      }}>
        {row.source === 'ai' ? 'IA' : 'Manual'}
      </span>
    ),
  },
  {
    key: 'quality_score',
    label: 'Score',
    sortable: true,
    render: (row) => {
      const s = row.quality_score
      const color = s == null ? 'var(--admin-text-muted)' : s < 40 ? 'var(--admin-danger)' : s < 70 ? 'var(--admin-warning)' : 'var(--admin-success)'
      const bg = s == null ? 'rgba(255,255,255,.06)' : s < 40 ? 'rgba(239,68,68,.15)' : s < 70 ? 'rgba(245,158,11,.15)' : 'rgba(34,197,94,.15)'
      return (
        <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: bg, color }}>
          {s ?? '\u2014'}
        </span>
      )
    },
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
      <Link href={`/admin/articles/${row.id}`} style={{ color: 'var(--admin-accent)', fontSize: 12, fontWeight: 600 }}>
        Editer
      </Link>
    ),
  },
]

export function ArticlesTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchKeys={['title', 'slug', 'category']}
      emptyMessage="Aucun article"
    />
  )
}
