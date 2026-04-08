import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser()

  return (
    <section className="section">
      <div className="hedjav-container">
        <div className="hedjav-grid-2" style={{ alignItems: 'start', gap: 'var(--s10)' }}>
          <aside
            style={{
              position: 'sticky',
              top: 96,
              padding: 'var(--s6)',
              background: 'var(--surface)',
              borderRadius: 'var(--r16)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s2)',
            }}
          >
            <span className="eyebrow" style={{ marginBottom: 'var(--s3)' }}>
              Espace membre
            </span>
            <SideLink href="/dashboard">Tableau de bord</SideLink>
            <SideLink href="/dashboard/mes-ebooks">Mes ebooks</SideLink>
            <SideLink href="/dashboard/mes-commandes">Mes commandes</SideLink>
            <SideLink href="/dashboard/profil">Mon profil</SideLink>
          </aside>

          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

function SideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: 'var(--s3) var(--s4)',
        borderRadius: 'var(--r8)',
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        color: 'var(--text)',
      }}
    >
      {children}
    </Link>
  )
}
