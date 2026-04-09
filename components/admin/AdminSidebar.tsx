'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/LogoutButton'

type NavItem = { href: string; label: string; icon: string; badge?: number }
type NavSection = { title: string; items: NavItem[] }

type Props = {
  adminName: string
  adminEmail: string
  ebookCount: number
  articleCount: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

export function AdminSidebar({ adminName, adminEmail, ebookCount, articleCount }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sections: NavSection[] = [
    {
      title: 'Tableau de bord',
      items: [
        { href: '/admin', label: 'Vue d\'ensemble', icon: '' },
      ],
    },
    {
      title: 'Contenu',
      items: [
        { href: '/admin/ebooks', label: 'Ebooks', icon: '', badge: ebookCount },
        { href: '/admin/articles', label: 'Articles', icon: '', badge: articleCount },
        { href: '/admin/pages', label: 'Pages legales', icon: '' },
      ],
    },
    {
      title: 'Clients',
      items: [
        { href: '/admin/clients', label: 'Clients', icon: '' },
        { href: '/admin/ventes', label: 'Ventes', icon: '' },
        { href: '/admin/factures', label: 'Factures', icon: '' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { href: '/admin/newsletter', label: 'Abonnes', icon: '' },
        { href: '/admin/campagnes', label: 'Campagnes', icon: '' },
        { href: '/admin/popup', label: 'Pop-up', icon: '' },
      ],
    },
    {
      title: 'Systeme',
      items: [
        { href: '/admin/config', label: 'Configuration', icon: '' },
        { href: '/admin/mediatheque', label: 'Mediatheque', icon: '' },
        { href: '/admin/ia', label: 'IA & Logs', icon: '' },
        { href: '/admin/membres', label: 'Equipe', icon: '' },
        { href: '/admin/notifications', label: 'Notifications', icon: '' },
      ],
    },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1001,
          display: 'none',
          background: 'var(--admin-surface)',
          color: 'var(--admin-accent)',
          border: '1px solid var(--admin-border)',
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--fb)',
          fontSize: 18,
        }}
        className="admin-mobile-toggle"
        aria-label="Toggle menu"
      >
        {mobileOpen ? '\u2715' : '\u2630'}
      </button>

      <aside
        className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''}`}
        style={{
          width: 260,
          background: 'var(--admin-surface)',
          borderRight: '1px solid var(--admin-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflow: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--admin-accent)',
              letterSpacing: '.02em',
            }}
          >
            EGP
          </div>
          <span
            style={{
              fontSize: 10,
              color: 'var(--admin-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.15em',
              fontWeight: 600,
            }}
          >
            Administration
          </span>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.15em',
                  color: 'var(--admin-text-muted)',
                  fontWeight: 600,
                  padding: '16px 20px 6px',
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 20px',
                      fontSize: 13,
                      color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)',
                      background: active ? 'rgba(197,160,40,.08)' : 'transparent',
                      borderLeft: active ? '3px solid var(--admin-accent)' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all .15s',
                      fontFamily: 'var(--fb)',
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          background: 'rgba(197,160,40,.2)',
                          color: 'var(--admin-accent)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 9999,
                          minWidth: 18,
                          textAlign: 'center',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--admin-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
                flexShrink: 0,
              }}
            >
              {getInitials(adminName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--admin-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {adminName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {adminEmail}
              </div>
            </div>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '6px 12px',
              color: 'var(--admin-text-muted)',
              border: '1px solid var(--admin-border)',
              borderRadius: 6,
              fontFamily: 'var(--fb)',
              fontSize: 12,
              textDecoration: 'none',
              marginBottom: 8,
              transition: 'all .15s',
            }}
          >
            {'\u21A9'} Retour au site
          </a>

          <LogoutButton
            style={{
              width: '100%',
              padding: '6px 12px',
              background: 'transparent',
              color: '#ff9b9b',
              border: '1px solid rgba(255,155,155,.3)',
              borderRadius: 6,
              fontFamily: 'var(--fb)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          />
        </div>
      </aside>
    </>
  )
}
