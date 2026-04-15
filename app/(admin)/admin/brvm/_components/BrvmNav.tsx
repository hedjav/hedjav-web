'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'

/**
 * Sidebar de navigation du Centre de Veille BRVM (refonte 4 univers).
 *
 * Structure :
 *   • Vue d'ensemble
 *   • Données de marché    (Résumé · Actions · Obligations · Indices)
 *   • Rapports cotées      (Liste sociétés)
 *   • Annonces émetteurs   (Toutes · 8 sous-catégories)
 *   • Publications         (BOC · 6 autres)
 *   • ⚙ Maintenance
 *   • ⏰ Alertes
 */

type NavItem = { href: string; label: string; exact?: boolean }
type NavSection = {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
}

const SECTIONS: NavSection[] = [
  {
    title: 'Aperçu',
    items: [{ href: '/admin/brvm', label: "Vue d'ensemble", exact: true }],
    defaultOpen: true,
  },
  {
    title: 'Données de marché',
    items: [
      { href: '/admin/brvm/marche?tab=resume', label: 'Résumé séance' },
      { href: '/admin/brvm/marche?tab=actions', label: 'Cours actions' },
      { href: '/admin/brvm/marche?tab=obligations', label: 'Cours obligations' },
      { href: '/admin/brvm/marche?tab=indices', label: 'Indices BRVM' },
    ],
    defaultOpen: true,
  },
  {
    title: 'Rapports cotées',
    items: [
      { href: '/admin/brvm/rapports', label: 'Liste des sociétés', exact: true },
    ],
    defaultOpen: true,
  },
  {
    title: 'Annonces émetteurs',
    items: [
      { href: '/admin/brvm/annonces', label: 'Toutes les annonces', exact: true },
      { href: '/admin/brvm/annonces/convocation_ag', label: 'Convocations AG' },
      { href: '/admin/brvm/annonces/projet_resolution', label: 'Projets de résolution' },
      { href: '/admin/brvm/annonces/notation_financiere', label: 'Notations financières' },
      { href: '/admin/brvm/annonces/esv', label: 'Événements sur valeurs' },
      { href: '/admin/brvm/annonces/communique', label: 'Communiqués' },
      { href: '/admin/brvm/annonces/changement_dirigeant', label: 'Changements de dirigeants' },
      { href: '/admin/brvm/annonces/franchissement_seuil', label: 'Franchissements de seuil' },
      { href: '/admin/brvm/annonces/information_permanente', label: 'Informations permanentes' },
    ],
  },
  {
    title: 'Publications',
    items: [
      { href: '/admin/brvm/publications', label: 'Toutes les publications', exact: true },
      { href: '/admin/brvm/publications/boc', label: 'Bulletins Officiels (BOC)' },
      { href: '/admin/brvm/publications/bulletin_mensuel', label: 'Bulletins mensuels' },
      { href: '/admin/brvm/publications/statistique_trimestrielle', label: 'Statistiques trimestrielles' },
      { href: '/admin/brvm/publications/annee_boursiere', label: 'Années boursières' },
      { href: '/admin/brvm/publications/avis', label: 'Avis' },
      { href: '/admin/brvm/publications/donnee_economique', label: 'Données économiques' },
      { href: '/admin/brvm/publications/valeur_liquidative', label: 'Valeurs liquidatives' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { href: '/admin/brvm/alertes', label: 'Alertes email' },
      { href: '/admin/brvm/maintenance', label: 'Maintenance' },
    ],
    defaultOpen: true,
  },
]

function isActive(href: string, pathname: string, exact?: boolean): boolean {
  const base = href.split('?')[0]
  if (exact) return pathname === base
  if (pathname === base) return true
  return pathname.startsWith(base + '/')
}

export function BrvmNav() {
  const pathname = usePathname()
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.title, s.defaultOpen ?? false]))
  )

  // Auto-open section when child active
  const computedOpen = useMemo(() => {
    const next = { ...openMap }
    for (const s of SECTIONS) {
      if (s.items.some((i) => isActive(i.href, pathname, i.exact))) next[s.title] = true
    }
    return next
  }, [openMap, pathname])

  return (
    <aside
      aria-label="Navigation Centre de Veille BRVM"
      style={{
        width: 260,
        minWidth: 260,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12,
        padding: 'var(--s5) var(--s4)',
        position: 'sticky',
        top: 'var(--s4)',
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - var(--s6))',
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: 'var(--s5)' }}>
        <p
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--admin-text)',
            lineHeight: 1.2,
          }}
        >
          Centre BRVM
        </p>
        <p
          style={{
            fontSize: 11,
            color: 'var(--admin-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            marginTop: 4,
          }}
        >
          4 univers métiers
        </p>
      </div>

      {SECTIONS.map((section) => {
        const open = computedOpen[section.title] ?? false
        const hasActive = section.items.some((i) => isActive(i.href, pathname, i.exact))

        return (
          <div key={section.title} style={{ marginBottom: 'var(--s3)' }}>
            <button
              type="button"
              onClick={() =>
                setOpenMap((prev) => ({ ...prev, [section.title]: !open }))
              }
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                padding: '6px 4px',
                textAlign: 'left',
                fontFamily: 'var(--fb)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: hasActive
                  ? 'var(--admin-accent, #C5A028)'
                  : 'var(--admin-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{section.title}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
            </button>
            {open && (
              <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0 0 0' }}>
                {section.items.map((item) => {
                  const active = isActive(item.href, pathname, item.exact)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        style={{
                          display: 'block',
                          padding: '7px 12px',
                          margin: '1px 0',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 13,
                          fontFamily: 'var(--fb)',
                          fontWeight: active ? 600 : 500,
                          color: active
                            ? 'var(--admin-text)'
                            : 'var(--admin-text-muted)',
                          background: active
                            ? 'color-mix(in srgb, var(--admin-accent, #C5A028) 12%, transparent)'
                            : 'transparent',
                          borderLeft: active
                            ? '2px solid var(--admin-accent, #C5A028)'
                            : '2px solid transparent',
                          transition: 'background 0.12s, color 0.12s',
                        }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </aside>
  )
}
