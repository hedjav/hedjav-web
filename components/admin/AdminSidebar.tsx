'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/LogoutButton'

type NavItem = { href: string; label: string; badge?: number }
type NavSection = { title: string; items: NavItem[] }

type Props = {
  sections: NavSection[]
  adminName: string
  adminEmail: string
}

export function AdminSidebar({ sections, adminName, adminEmail }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1001,
          display: 'none',
          background: '#1B2A4A',
          color: '#C5A028',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--fb)',
          fontSize: 18,
        }}
        className="admin-mobile-toggle"
        aria-label="Toggle menu"
      >
        {collapsed ? '✕' : '☰'}
      </button>

      <aside
        className={`admin-sidebar ${collapsed ? 'admin-sidebar--open' : ''}`}
        style={{
          width: 250,
          background: '#060C15',
          borderRight: '1px solid rgba(255,255,255,.08)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflow: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 8px' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 24,
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Hedjav
          </Link>
          <span
            style={{
              fontSize: 10,
              color: '#C5A028',
              textTransform: 'uppercase',
              letterSpacing: '.15em',
              fontWeight: 700,
              fontVariant: 'small-caps',
            }}
          >
            Admin
          </span>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '.15em',
                  color: '#6B82B0',
                  fontWeight: 600,
                  padding: '12px 20px 4px',
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 20px',
                      fontSize: 13,
                      color: active ? '#fff' : '#C2CEDE',
                      background: active ? 'rgba(197,160,40,.1)' : 'transparent',
                      borderLeft: active ? '3px solid #C5A028' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all .15s',
                      fontFamily: 'var(--fb)',
                    }}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          background: 'rgba(197,160,40,.2)',
                          color: '#C5A028',
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

        {/* Footer : admin info */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#E0E6EF',
              marginBottom: 2,
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
              color: 'rgba(255,255,255,.4)',
              marginBottom: 12,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {adminEmail}
          </div>
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
