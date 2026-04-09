'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AdminNotifications } from './AdminNotifications'

type Props = {
  adminName: string
  initialUnread: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Vue d\'ensemble',
  '/admin/ebooks': 'Ebooks',
  '/admin/articles': 'Articles',
  '/admin/pages': 'Pages legales',
  '/admin/clients': 'Clients',
  '/admin/ventes': 'Ventes',
  '/admin/factures': 'Factures',
  '/admin/newsletter': 'Abonnes newsletter',
  '/admin/campagnes': 'Campagnes',
  '/admin/popup': 'Pop-up',
  '/admin/config': 'Configuration',
  '/admin/mediatheque': 'Mediatheque',
  '/admin/ia': 'IA & Logs',
  '/admin/membres': 'Equipe',
  '/admin/notifications': 'Notifications',
}

function getBreadcrumb(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Try parent route
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(route + '/')) return label
  }
  return 'Admin'
}

export function AdminHeader({ adminName, initialUnread }: Props) {
  const pathname = usePathname()
  const breadcrumb = getBreadcrumb(pathname)
  const [unread, setUnread] = useState(initialUnread)

  // Poll for notification count every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/notifications')
        if (res.ok) {
          const data = await res.json()
          setUnread(data.unread_count ?? 0)
        }
      } catch { /* ignore */ }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
        background: 'var(--admin-surface)',
        borderBottom: '1px solid var(--admin-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--admin-text-muted)', fontFamily: 'var(--fb)' }}>
          Admin
        </span>
        <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--admin-text)', fontWeight: 600, fontFamily: 'var(--fb)' }}>
          {breadcrumb}
        </span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <AdminNotifications initialCount={unread} />
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(197,160,40,.15)',
            color: 'var(--admin-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {getInitials(adminName)}
        </div>
      </div>
    </header>
  )
}
