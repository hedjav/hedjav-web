'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/LogoutButton'

type NavItem = { href: string; label: string; badge?: number }
type NavSection = {
  title: string
  items: NavItem[]
  /** If true, this is a direct link, not an accordion group */
  directLink?: string
}

type Props = {
  adminName: string
  adminEmail: string
  ebookCount: number
  articleCount: number
  notificationCount?: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform .2s ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <path d="M4 2l4 4-4 4" />
    </svg>
  )
}

export function AdminSidebar({ adminName, adminEmail, ebookCount, articleCount, notificationCount }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sections: NavSection[] = [
    {
      title: 'Tableau de bord',
      directLink: '/admin',
      items: [],
    },
    {
      title: 'Contenu',
      items: [
        { href: '/admin/ebooks', label: 'Ebooks', badge: ebookCount },
        { href: '/admin/articles', label: 'Articles', badge: articleCount },
        { href: '/admin/pages', label: 'Pages legales' },
      ],
    },
    {
      title: 'Clients',
      items: [
        { href: '/admin/clients', label: 'Liste clients' },
        { href: '/admin/ventes', label: 'Ventes' },
        { href: '/admin/factures', label: 'Factures' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { href: '/admin/newsletter', label: 'Abonnes newsletter' },
        { href: '/admin/campagnes', label: 'Campagnes' },
        { href: '/admin/popup', label: 'Pop-up lead magnet' },
      ],
    },
    {
      title: 'BRVM & IA',
      items: [
        { href: '/admin/brvm', label: 'Veille BRVM' },
        { href: '/admin/ia/articles', label: 'Generateur articles' },
        { href: '/admin/ia/scoring', label: 'Scoring qualite' },
        { href: '/admin/ia', label: 'Logs IA' },
      ],
    },
    {
      title: 'Systeme',
      items: [
        { href: '/admin/config', label: 'Configuration' },
        { href: '/admin/mediatheque', label: 'Mediatheque' },
        { href: '/admin/membres', label: 'Equipe' },
        { href: '/admin/notifications', label: 'Notifications', badge: notificationCount },
      ],
    },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  /** Determine which section should be open by default (contains active page) */
  function sectionContainsActive(section: NavSection): boolean {
    if (section.directLink) return isActive(section.directLink)
    return section.items.some((item) => isActive(item.href))
  }

  // Initialize open sections - the one containing active page is open
  const initialOpen = sections.reduce<Record<string, boolean>>((acc, s) => {
    acc[s.title] = sectionContainsActive(s)
    return acc
  }, {})

  const [openSections, setOpenSections] = useState(initialOpen)

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }))
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
          {sections.map((section) => {
            // Direct link (Tableau de bord)
            if (section.directLink) {
              const active = isActive(section.directLink)
              return (
                <div key={section.title} style={{ marginBottom: 4 }}>
                  <Link
                    href={section.directLink}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)',
                      background: active ? 'rgba(197,160,40,.08)' : 'transparent',
                      borderLeft: active ? '3px solid var(--admin-accent)' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all .15s',
                      fontFamily: 'var(--fb)',
                    }}
                  >
                    {section.title}
                  </Link>
                </div>
              )
            }

            // Accordion section
            const isOpen = openSections[section.title] ?? false
            return (
              <div key={section.title} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => toggleSection(section.title)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--fb)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.15em',
                    color: 'var(--admin-text-muted)',
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  <ChevronIcon open={isOpen} />
                  <span style={{ flex: 1 }}>{section.title}</span>
                </button>
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: isOpen ? `${section.items.length * 40}px` : '0px',
                    transition: 'max-height .25s ease',
                  }}
                >
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
                          padding: '8px 20px 8px 40px',
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
              </div>
            )
          })}
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
