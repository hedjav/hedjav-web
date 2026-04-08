import Link from 'next/link'
import { requireUser, getCurrentProfile } from '@/lib/auth/session'
import { touchLastVisit } from '@/lib/dashboard/queries'

const TABS = [
  { href: '/dashboard',                label: 'Vue d’ensemble' },
  { href: '/dashboard/mes-ebooks',     label: 'Mes ebooks' },
  { href: '/dashboard/mes-commandes',  label: 'Mes commandes' },
  { href: '/dashboard/outils',         label: 'Outils' },
  { href: '/dashboard/alertes',        label: 'Alertes' },
  { href: '/dashboard/profil',         label: 'Mon profil' },
] as const

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const profile = await getCurrentProfile()
  const firstName = (profile?.full_name ?? user.email ?? '').split(' ')[0] || 'Membre'
  const initials = firstName.slice(0, 2).toUpperCase()

  // Mémorise la dernière visite (sert pour les alertes)
  await touchLastVisit(user.id)

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 72px)' }}>
      {/* Dashboard header */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="hedjav-container" style={{ paddingBlock: 'var(--s8)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s5)',
              flexWrap: 'wrap',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--rfull)',
                background: 'var(--g500)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--fb)',
                fontWeight: 700,
                fontSize: 'var(--text-xl)',
                boxShadow: 'var(--shc)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">Espace membre</span>
              <h1
                className="h2"
                style={{
                  marginTop: 'var(--s2)',
                  fontSize: 'clamp(var(--text-2xl), 4vw, var(--text-3xl))',
                }}
              >
                Bonjour, {firstName}
              </h1>
            </div>
          </div>

          {/* Navigation horizontale */}
          <nav
            aria-label="Navigation dashboard"
            style={{
              marginTop: 'var(--s8)',
              display: 'flex',
              gap: 'var(--s2)',
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--border)',
              marginBottom: 'calc(var(--s2) * -1)',
            }}
          >
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="hedjav-dash-tab"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="hedjav-container" style={{ paddingBlock: 'var(--s10)' }}>
        {children}
      </div>
    </div>
  )
}
