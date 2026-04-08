import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/session'
import { signOutAction } from '@/lib/auth/actions'

const NAV = [
  { href: '/admin', label: 'Vue d’ensemble' },
  { href: '/admin/ebooks', label: 'Ebooks' },
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/membres', label: 'Membres' },
  { href: '/admin/ventes', label: 'Ventes' },
  { href: '/admin/ia', label: 'Outils IA' },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1628',
        color: '#E0E6EF',
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
      }}
    >
      <aside
        style={{
          background: '#060C15',
          borderRight: '1px solid rgba(255,255,255,.08)',
          padding: 'var(--s8) var(--s5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s2)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            color: '#fff',
            marginBottom: 'var(--s2)',
            display: 'block',
          }}
        >
          Hedjav
        </Link>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: '#C5A028',
            textTransform: 'uppercase',
            letterSpacing: '.15em',
            fontWeight: 600,
            marginBottom: 'var(--s5)',
          }}
        >
          Admin
        </span>

        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: 'var(--s3) var(--s4)',
              fontSize: 'var(--text-sm)',
              color: '#E0E6EF',
              borderRadius: 'var(--r8)',
              transition: 'background var(--tf)',
            }}
          >
            {item.label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 'var(--s8)', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.4)', marginBottom: 'var(--s2)' }}>
            Connecté en tant que
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{profile.full_name ?? profile.email}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', marginBottom: 'var(--s4)' }}>{profile.email}</div>
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: 'var(--s2) var(--s4)',
                background: 'transparent',
                color: '#ff9b9b',
                border: '1px solid rgba(255,155,155,.3)',
                borderRadius: 'var(--r8)',
                fontFamily: 'var(--fb)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <main style={{ padding: 'var(--s10) var(--s10)' }}>{children}</main>
    </div>
  )
}
