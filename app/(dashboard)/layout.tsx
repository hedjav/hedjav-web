import Link from 'next/link'
import { requireUser, getCurrentProfile } from '@/lib/auth/session'
import { touchLastVisit } from '@/lib/dashboard/queries'

const SUBNAV = [
  { href: '/dashboard',                label: 'Vue d’ensemble' },
  { href: '/dashboard/mes-ebooks',     label: 'Mes ebooks' },
  { href: '/dashboard/mes-commandes',  label: 'Mes commandes' },
  { href: '/dashboard/outils',         label: 'Outils' },
  { href: '/dashboard/alertes',        label: 'Alertes' },
  { href: '/dashboard/profil',         label: 'Profil' },
] as const

function firstNameOf(profile: { full_name: string | null } | null): string | null {
  const full = profile?.full_name?.trim()
  if (!full) return null
  return full.split(' ')[0] || null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const profile = await getCurrentProfile()
  const firstName = firstNameOf(profile)

  await touchLastVisit(user.id)

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 72px)' }}>
      {/* Header dashboard — minimal */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="hedjav-container" style={{ paddingBlock: 'var(--s10)' }}>
          <span className="eyebrow">Espace membre</span>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s3)',
              fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-4xl))',
              fontWeight: 600,
            }}
          >
            {firstName ? `Bienvenue, ${firstName}` : 'Bienvenue'}
          </h1>

          {/* Subnav discrète : petits liens texte séparés */}
          <nav
            aria-label="Navigation espace membre"
            style={{
              marginTop: 'var(--s6)',
              display: 'flex',
              gap: 'var(--s5)',
              flexWrap: 'wrap',
              fontSize: 'var(--text-sm)',
            }}
          >
            {SUBNAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: 'var(--muted)',
                  fontWeight: 500,
                  position: 'relative',
                  paddingBottom: 2,
                }}
                className="hedjav-dash-sublink"
              >
                {item.label}
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
