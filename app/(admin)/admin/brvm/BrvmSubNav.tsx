'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/brvm', label: 'Documents' },
  { href: '/admin/brvm/downloader', label: 'Downloader PDF' },
  { href: '/admin/brvm/maintenance', label: 'Maintenance' },
]

/**
 * Sous-navigation partagée entre les 3 pages admin BRVM.
 * Rendu dans chaque `page.tsx` (pas de layout.tsx partagé pour rester
 * explicite sur chaque page).
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
