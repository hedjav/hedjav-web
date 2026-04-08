import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentProfile, getCurrentUser } from '@/lib/auth/session'
import { getCurrentUserPaidEbooks } from '@/lib/purchases/queries'
import {
  countTotalEbooks,
  getNewArticlesSince,
  getNewEbooksSince,
  profileCompletion,
  memberBadge,
} from '@/lib/dashboard/queries'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default async function DashboardHome() {
  const [user, profile, paidEbooks, totalEbooks] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getCurrentUserPaidEbooks(),
    countTotalEbooks(),
  ])

  const completion = profile ? profileCompletion(profile) : 0
  const badge = memberBadge(paidEbooks.length)

  // last_visit_at vient d'être touché par le layout — on lit la valeur AVANT
  // la mise à jour via metadata, mais ici on prend simplement les nouveautés
  // de la dernière semaine pour le MVP.
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const [newArticles, newEbooks] = await Promise.all([
    getNewArticlesSince(since),
    getNewEbooksSince(since),
  ])

  return (
    <div className="hedjav-dash-grid">
      {/* Card 1 — Mes ebooks */}
      <div className="hedjav-dash-card">
        <Header eyebrow="Bibliothèque" title="Mes ebooks" />
        <BigNumber value={paidEbooks.length} suffix={`/ ${totalEbooks} disponibles`} />
        <ProgressBar pct={totalEbooks ? Math.round((paidEbooks.length / totalEbooks) * 100) : 0} />
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <Link href="/dashboard/mes-ebooks" className="btn btn-outline btn-sm">Ma bibliothèque</Link>
          <Link href="/ebooks" className="btn btn-gold btn-sm">Voir le catalogue</Link>
        </div>
      </div>

      {/* Card 2 — Outils patrimoniaux */}
      <div className="hedjav-dash-card">
        <Header eyebrow="Nouveau" title="Outils patrimoniaux" />
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
          Simulez votre épargne long terme et le rendement net d&apos;un
          investissement immobilier locatif en zone UEMOA.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <Bullet>Simulateur d&apos;épargne</Bullet>
          <Bullet>Simulateur rendement locatif</Bullet>
        </ul>
        <Link href="/dashboard/outils" className="btn btn-gold btn-sm" style={{ alignSelf: 'flex-start' }}>
          Lancer un simulateur
        </Link>
      </div>

      {/* Card 3 — Ma progression */}
      <div className="hedjav-dash-card">
        <Header eyebrow="Profil" title="Ma progression" />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Profil complété</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{completion}%</span>
          </div>
          <ProgressBar pct={completion} />
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--s2)',
            padding: 'var(--s2) var(--s4)',
            background: 'var(--g100)',
            color: badge.color,
            borderRadius: 'var(--rfull)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            alignSelf: 'flex-start',
          }}
        >
          ★ {badge.label}
        </div>
        <Link href="/dashboard/profil" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
          Compléter mon profil
        </Link>
      </div>

      {/* Card 4 — Mes alertes */}
      <div className="hedjav-dash-card">
        <Header eyebrow="Activité" title="Mes alertes" />
        <BigNumber value={newArticles.length + newEbooks.length} suffix="nouveautés cette semaine" />
        {newArticles.length === 0 && newEbooks.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Rien de nouveau pour le moment. Revenez bientôt.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s2)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {newEbooks.slice(0, 2).map((e) => (
              <li key={e.id}>📚 <Link href={`/ebooks/${e.slug}`} style={{ color: 'var(--g700)', fontWeight: 600 }}>{e.title}</Link></li>
            ))}
            {newArticles.slice(0, 3).map((a) => (
              <li key={a.id}>✍️ <Link href={`/blog/${a.slug}`} style={{ color: 'var(--g700)', fontWeight: 600 }}>{a.title}</Link></li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/alertes" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
          Toutes les alertes
        </Link>
      </div>
    </div>
  )
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-2xl)', fontWeight: 600, marginTop: 'var(--s2)' }}>
        {title}
      </h2>
    </div>
  )
}

function BigNumber({ value, suffix }: { value: number; suffix: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s3)' }}>
      <span style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-5xl)', fontWeight: 700, color: 'var(--g700)', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{suffix}</span>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ width: '100%', height: 8, background: 'var(--n100)', borderRadius: 999, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--g500), var(--g700))',
          transition: 'width var(--ts)',
        }}
      />
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
      <span style={{ color: 'var(--g500)', fontWeight: 700 }}>✓</span>
      {children}
    </li>
  )
}
