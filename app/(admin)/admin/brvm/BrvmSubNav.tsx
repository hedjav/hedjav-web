'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/brvm', label: 'Veille & archivage' },
  { href: '/admin/brvm/alertes', label: 'Alertes email' },
  { href: '/admin/brvm/maintenance', label: 'Maintenance' },
]

/**
 * Sous-navigation du Centre de Veille BRVM.
 * Le "downloader" n'est plus une page séparée : il est intégré au hub principal
 * (filtre période + bouton « Archiver PDFs de la sélection »).
 */
export function BrvmSubNav() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 'var(--s6)',
        borderBottom: '1px solid var(--admin-border)',
        flexWrap: 'wrap',
      }}
    >
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/admin/brvm' ? pathname === '/admin/brvm' : pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '12px 20px',
              textDecoration: 'none',
              borderBottom: isActive
                ? '2px solid var(--admin-accent, #C5A028)'
                : '2px solid transparent',
              color: isActive ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text-muted)',
              fontFamily: 'var(--fb)',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
