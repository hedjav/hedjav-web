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
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const initials = (fullName || email)
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      ref={ref}
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu utilisateur"
        title={fullName || email}
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--rfull)',
          background: 'var(--g500)',
          color: '#fff',
          border: '2px solid var(--g500)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--fb)',
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all var(--tf)',
          boxShadow: 'var(--sha)',
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            minWidth: 260,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r12)',
            boxShadow: 'var(--shc)',
            padding: 'var(--s3)',
            zIndex: 60,
            animation: 'fadeIn var(--tb) ease both',
          }}
        >
          <div
            style={{
              padding: 'var(--s3) var(--s3) var(--s4)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 'var(--s2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s3)',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--rfull)',
                background: 'var(--g500)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {fullName || 'Mon compte'}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {email}
              </div>
            </div>
          </div>

          <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
            Tableau de bord
          </MenuLink>
          <MenuLink href="/dashboard/profil" onClick={() => setOpen(false)}>
            Mon profil
          </MenuLink>
          <MenuLink href="/dashboard/mes-ebooks" onClick={() => setOpen(false)}>
            Mes ebooks
          </MenuLink>
          <MenuLink href="/dashboard/mes-commandes" onClick={() => setOpen(false)}>
            Mes commandes
          </MenuLink>

          <div
            style={{
              marginTop: 'var(--s2)',
              borderTop: '1px solid var(--border)',
              paddingTop: 'var(--s2)',
            }}
          >
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

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) {
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
