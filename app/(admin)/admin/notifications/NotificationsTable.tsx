'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    case 'registration': return '+'
    case 'newsletter': return '@'
    case 'unsubscribe': return '-'
    case 'report': return '#'
    case 'error': return '!'
    case 'subscriber': return '@'
    case 'member': return '+'
    default: return '!'
  }
}

function typeColor(type: string): string {
  switch (type) {
    case 'purchase': return 'var(--admin-success)'
    case 'newsletter':
    case 'subscriber': return 'var(--admin-info)'
    case 'registration':
    case 'member': return 'var(--admin-accent)'
    case 'error': return 'var(--admin-danger)'
    case 'unsubscribe': return '#ff9b9b'
    default: return 'var(--admin-text)'
  }
}

function typeLink(type: string): string {
  switch (type) {
    case 'purchase': return '/admin/ventes'
    case 'registration':
    case 'member': return '/admin/clients'
    case 'newsletter':
    case 'subscriber':
    case 'unsubscribe': return '/admin/newsletter'
    case 'report': return '/admin'
    case 'error': return '/admin/ia'
    default: return '/admin'
  }
}

function priorityBadge(priority: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    urgent: { bg: 'rgba(239,68,68,.2)', color: '#ff6b6b' },
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export function NotificationsTable({ rows }: { rows: Row[] }) {
  const [marking, setMarking] = useState(false)
  const [localRows, setLocalRows] = useState(rows)
  const [search, setSearch] = useState('')

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

  async function handleMarkRead(id: string) {
    await fetch('/api/admin/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLocalRows((prev) => prev.map((r) => r.id === id ? { ...r, is_read: true } : r))
  }

  const unreadCount = localRows.filter((r) => !r.is_read).length

  const filtered = search.trim()
    ? localRows.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.message.toLowerCase().includes(search.toLowerCase()) ||
        r.type.toLowerCase().includes(search.toLowerCase())
      )
    : localRows

  return (
    <>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
            {unreadCount} non-lue{unreadCount !== 1 ? 's' : ''}
          </span>
          {unreadCount > 0 && (
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
          )}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '8px 14px',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            color: 'var(--admin-text)',
            fontSize: 13,
            fontFamily: 'var(--fb)',
          }}
        />
      </div>

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--admin-text-muted)', fontSize: 13 }}>
            Aucune notification
          </div>
        )}
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={typeLink(row.type)}
            onClick={() => { if (!row.is_read) handleMarkRead(row.id) }}
            style={{
              display: 'flex',
              gap: 12,
              padding: '14px 20px',
              background: row.is_read ? 'var(--admin-surface)' : 'rgba(197,160,40,.05)',
              border: '1px solid var(--admin-border)',
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'all .15s',
              alignItems: 'flex-start',
            }}
          >
            {/* Icon */}
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: typeColor(row.type),
                flexShrink: 0,
              }}
            >
              {typeIcon(row.type)}
            </span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: row.is_read ? 400 : 700, color: 'var(--admin-text)' }}>
                  {row.title}
                </span>
                {(row.priority === 'high' || row.priority === 'urgent') && priorityBadge(row.priority)}
                {!row.is_read && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 9999,
                      background: 'var(--admin-accent)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
              {row.message && (
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                  {row.message}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                {timeAgo(row.created_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
