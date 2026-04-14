'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  notificationColor,
  notificationIcon,
  resolveNotificationTarget,
} from '@/lib/notifications/target-url'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, unknown> | null
  target_url?: string | null
  entity_type?: string | null
  entity_id?: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export function AdminNotifications({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setCount(data.unread_count ?? 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  function toggle() {
    if (!open) fetchNotifications()
    setOpen(!open)
  }

  async function markAllRead() {
    await fetch('/api/admin/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setCount(0)
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)),
      )
      setCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    // Destination : d'abord target_url en base, sinon résolu depuis metadata,
    // jamais un /admin générique.
    router.push(resolveNotificationTarget(n))
  }

  // Tri : non-lu d'abord, puis date DESC (jamais d'ordre inverse).
  const sorted = [...notifications]
    .sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 8)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 4,
        }}
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'var(--admin-danger)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 9999,
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 380,
            maxHeight: 520,
            overflowY: 'auto',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,.5)',
            zIndex: 1000,
            fontFamily: 'var(--fb)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--admin-border)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
              Notifications
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--admin-accent)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 12 }}>
              Chargement...
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 12 }}>
              Aucune notification
            </div>
          ) : (
            sorted.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                  background: n.is_read ? 'transparent' : 'rgba(197,160,40,.05)',
                  cursor: 'pointer',
                  transition: 'background .15s',
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'var(--fb)',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: notificationColor(n.type),
                    flexShrink: 0,
                  }}
                >
                  {notificationIcon(n.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: 'var(--admin-text)' }}>
                    {n.title}
                  </div>
                  {n.message && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--admin-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {n.message}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                    {timeAgo(n.created_at)}
                    {n.priority === 'high' || n.priority === 'urgent' ? (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: 'rgba(255, 107, 107, 0.15)',
                          color: '#ff6b6b',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {n.priority}
                      </span>
                    ) : null}
                  </div>
                </div>
                {!n.is_read && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 9999,
                      background: 'var(--admin-accent)',
                      alignSelf: 'center',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            ))
          )}

          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--admin-accent)',
              borderTop: '1px solid var(--admin-border)',
              textDecoration: 'none',
            }}
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}
