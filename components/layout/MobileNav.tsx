'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { navLinks } from './nav-links'
import { LogoutButton } from '@/components/features/LogoutButton'

type Props = {
  isAuthenticated?: boolean
  fullName?: string | null
  email?: string | null
}

export function MobileNav({ isAuthenticated, fullName, email }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="hedjav-burger"
        style={{
          width: 40,
          height: 40,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--rfull)',
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--s6)',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
            <span style={{ fontFamily: 'var(--fd)', fontWeight: 600, fontSize: 'var(--text-3xl)', color: 'var(--n900)' }}>
              Hedjav
            </span>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
              style={{
                width: 40, height: 40, borderRadius: 'var(--rfull)', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: 'var(--fd)',
                  fontWeight: 500,
                  fontSize: 'var(--text-3xl)',
                  color: 'var(--text)',
                  padding: 'var(--s2) 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {isAuthenticated ? (
            <div style={{ marginTop: 'var(--s8)' }}>
              {(fullName || email) && (
                <div
                  style={{
                    padding: 'var(--s4) 0',
                    marginBottom: 'var(--s4)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
                    Connecté
                  </div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginTop: 'var(--s1)' }}>
                    {fullName || email}
                  </div>
                </div>
              )}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
                <Link href="/dashboard"               onClick={() => setOpen(false)} style={memberLink}>Tableau de bord</Link>
                <Link href="/dashboard/profil"        onClick={() => setOpen(false)} style={memberLink}>Mon profil</Link>
                <Link href="/dashboard/mes-ebooks"    onClick={() => setOpen(false)} style={memberLink}>Mes ebooks</Link>
                <Link href="/dashboard/mes-commandes" onClick={() => setOpen(false)} style={memberLink}>Mes commandes</Link>
              </nav>
              <LogoutButton
                style={{
                  width: '100%',
                  padding: 'var(--s4)',
                  background: 'transparent',
                  color: 'var(--err)',
                  border: '1.5px solid var(--err)',
                  borderRadius: 'var(--r8)',
                  fontFamily: 'var(--fb)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              />
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn btn-gold btn-lg"
              style={{ marginTop: 'var(--s8)', justifyContent: 'center' }}
            >
              Espace membre
            </Link>
          )}
        </div>
      )}
    </>
  )
}

const memberLink = {
  fontFamily: 'var(--fb)',
  fontSize: 'var(--text-lg)',
  fontWeight: 500,
  color: 'var(--text)',
  padding: 'var(--s2) 0',
} as const
