import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default async function DashboardHome() {
  const profile = await getCurrentProfile()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Bienvenue'

  return (
    <>
      <span className="eyebrow">Bonjour</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        {firstName}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 'var(--s10)' }}>
        Voici votre espace personnel Hedjav.
      </p>

      <div className="hedjav-grid-3">
        <Card title="Mes ebooks" value="0" href="/dashboard/mes-ebooks" />
        <Card title="Mes commandes" value="0" href="/dashboard/mes-commandes" />
        <Card title="Newsletter" value={profile?.newsletter_opt ? 'Active' : 'Inactive'} href="/dashboard/profil" />
      </div>
    </>
  )
}

function Card({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        padding: 'var(--s6)',
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s2)',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
        {title}
      </span>
      <span style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 600 }}>
        {value}
      </span>
    </Link>
  )
}
