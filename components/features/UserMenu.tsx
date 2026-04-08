'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

type Props = { fullName: string; email: string }

export function UserMenu({ fullName, email }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = (fullName || email)
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-gold hedjav-cta-desktop"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--rfull)',
            background: 'rgba(255,255,255,.25)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}
          aria-hidden
        >
          {initials}
        </span>
        Mon compte
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 240,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r12)',
            boxShadow: 'var(--shc)',
            padding: 'var(--s3)',
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: 'var(--s3) var(--s3) var(--s4)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 'var(--s2)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{fullName || 'Mon compte'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 2 }}>{email}</div>
          </div>

          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>Dashboard</MenuLink>
          <MenuLink href="/dashboard/profil" onClick={() => setOpen(false)}>Mon profil</MenuLink>
          <MenuLink href="/dashboard/mes-ebooks" onClick={() => setOpen(false)}>Mes ebooks</MenuLink>

          <div style={{ marginTop: 'var(--s2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--s2)' }}>
            <LogoutButton
              style={{
                width: '100%',
                textAlign: 'left',
                padding: 'var(--s2) var(--s3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--fb)',
                fontSize: 'var(--text-sm)',
                color: 'var(--err)',
                borderRadius: 'var(--r8)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        padding: 'var(--s2) var(--s3)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text)',
        borderRadius: 'var(--r8)',
        transition: 'background var(--tf)',
      }}
    >
      {children}
    </Link>
  )
}
