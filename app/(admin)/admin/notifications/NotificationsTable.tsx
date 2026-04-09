'use client'

import { useState } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'

type Row = {
  id: string
  type: string
  title: string
  message: string
  priority: string
  is_read: boolean
  created_at: string
}

function typeIcon(type: string): string {
  switch (type) {
    case 'purchase': return '$'
    case 'subscriber': return '@'
    case 'member': return '+'
    default: return '!'
  }
}

function priorityBadge(priority: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    high: { bg: 'rgba(239,68,68,.15)', color: 'var(--admin-danger)' },
    normal: { bg: 'rgba(255,255,255,.06)', color: 'var(--admin-text-muted)' },
    low: { bg: 'rgba(59,130,246,.15)', color: 'var(--admin-info)' },
  }
  const s = colors[priority] ?? colors.normal
  return (
    <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {priority}
    </span>
  )
}

const columns: Column<Row>[] = [
  {
    key: 'type',
    label: 'Type',
    render: (row) => (
      <span style={{ fontSize: 16 }}>{typeIcon(row.type)}</span>
    ),
  },
  {
    key: 'title',
    label: 'Titre',
    sortable: true,
    render: (row) => (
      <span style={{ fontWeight: row.is_read ? 400 : 600 }}>{row.title}</span>
    ),
  },
  {
    key: 'message',
    label: 'Message',
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.message || '\u2014'}
      </span>
    ),
  },
  {
    key: 'priority',
    label: 'Priorite',
    render: (row) => priorityBadge(row.priority),
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
        {new Date(row.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    ),
  },
  {
    key: 'is_read',
    label: 'Lu',
    render: (row) => (
      <span
        style={{
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: row.is_read ? 'rgba(255,255,255,.06)' : 'rgba(197,160,40,.15)',
          color: row.is_read ? 'var(--admin-text-muted)' : 'var(--admin-accent)',
        }}
      >
        {row.is_read ? 'Lu' : 'Non lu'}
      </span>
    ),
  },
]

export function NotificationsTable({ rows }: { rows: Row[] }) {
  const [marking, setMarking] = useState(false)
  const [localRows, setLocalRows] = useState(rows)

  async function handleMarkAllRead() {
    setMarking(true)
    try {
      await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setLocalRows((prev) => prev.map((r) => ({ ...r, is_read: true })))
    } catch { /* ignore */ }
    setMarking(false)
  }

  const hasUnread = localRows.some((r) => !r.is_read)

  return (
    <>
      {hasUnread && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handleMarkAllRead}
            disabled={marking}
            style={{
              padding: '8px 16px',
              background: 'var(--admin-accent)',
              color: '#0F1117',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              fontFamily: 'var(--fb)',
              cursor: marking ? 'wait' : 'pointer',
            }}
          >
            {marking ? 'Marquage...' : 'Marquer tout comme lu'}
          </button>
        </div>
      )}
      <DataTable
        data={localRows}
        columns={columns}
        searchKeys={['title', 'message', 'type']}
        emptyMessage="Aucune notification"
      />
    </>
  )
}
