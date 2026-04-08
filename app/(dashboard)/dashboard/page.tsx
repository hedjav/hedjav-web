import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth/session'
import { getCurrentUserPaidEbooks } from '@/lib/purchases/queries'
import {
  countTotalEbooks,
  getNewArticlesSince,
  getNewEbooksSince,
  profileCompletion,
  memberBadge,
} from '@/lib/dashboard/queries'

export const metadata: Metadata = { title: 'Vue d’ensemble' }

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function DashboardHome() {
  const [profile, paidEbooks, totalEbooks] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserPaidEbooks(),
    countTotalEbooks(),
  ])

  const completion = profile ? profileCompletion(profile) : 0
  const badge = memberBadge(paidEbooks.length)

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  const [newArticles, newEbooks] = await Promise.all([
    getNewArticlesSince(since),
    getNewEbooksSince(since),
  ])
  const recent = [
    ...newEbooks.slice(0, 3).map((e) => ({
      type: 'ebook' as const,
      title: e.title,
      href: `/ebooks/${e.slug}`,
      date: e.created_at,
      meta: 'Ebook',
    })),
    ...newArticles.slice(0, 4).map((a) => ({
      type: 'article' as const,
      title: a.title,
      href: `/blog/${a.slug}`,
      date: a.published_at ?? a.created_at,
      meta: a.category,
    })),
  ]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)

  return (
    <div>
      {/* === Stats en ligne === */}
      <section className="hedjav-dash-section" style={{ paddingTop: 0 }}>
        <div className="hedjav-dash-stats">
          <Stat value={paidEbooks.length} label="Ebooks achetés" />
          <Stat value={`${completion}%`} label="Profil complété" />
          <Stat value={badge.label} label="Statut membre" small />
          <Stat value={fmtDate(profile?.created_at)} label="Membre depuis" small />
        </div>
      </section>

      {/* === Bibliothèque === */}
      <section className="hedjav-dash-section">
        <div className="hedjav-dash-section-head">
          <div>
            <h2 className="h3" style={{ fontSize: 'var(--text-2xl)' }}>Ma bibliothèque</h2>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--s2)' }}>
              {paidEbooks.length === 0
                ? 'Vous n’avez pas encore acheté d’ebook.'
                : `${paidEbooks.length} ebook${paidEbooks.length > 1 ? 's' : ''} sur ${totalEbooks} disponibles.`}
            </p>
          </div>
          <Link href={paidEbooks.length === 0 ? '/ebooks' : '/dashboard/mes-ebooks'} style={subtleLink}>
            {paidEbooks.length === 0 ? 'Voir le catalogue →' : 'Voir tout →'}
          </Link>
        </div>

        {paidEbooks.length > 0 && (
          <ul style={listReset}>
            {paidEbooks.slice(0, 3).map((e) => (
              <li key={e.id} style={listRow}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{e.title}</span>
                <Link href={`/ebooks/${e.slug}`} style={subtleLink}>Ouvrir</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === Outils === */}
      <section className="hedjav-dash-section">
        <div className="hedjav-dash-section-head">
          <div>
            <h2 className="h3" style={{ fontSize: 'var(--text-2xl)' }}>Outils patrimoniaux</h2>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--s2)' }}>
              Simulez votre épargne long terme et la rentabilité d&apos;un investissement immobilier locatif UEMOA.
            </p>
          </div>
          <Link href="/dashboard/outils" style={subtleLink}>Lancer un simulateur →</Link>
        </div>
        <ul style={listReset}>
          <li style={listRow}>
            <span style={{ fontSize: 'var(--text-sm)' }}>📈 Simulateur d&apos;épargne long terme</span>
            <Link href="/dashboard/outils#epargne" style={subtleLink}>Ouvrir</Link>
          </li>
          <li style={listRow}>
            <span style={{ fontSize: 'var(--text-sm)' }}>🏠 Simulateur de rendement locatif</span>
            <Link href="/dashboard/outils#locatif" style={subtleLink}>Ouvrir</Link>
          </li>
        </ul>
      </section>

      {/* === Activité récente === */}
      <section className="hedjav-dash-section">
        <div className="hedjav-dash-section-head">
          <div>
            <h2 className="h3" style={{ fontSize: 'var(--text-2xl)' }}>Activité récente</h2>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--s2)' }}>
              Les dernières publications Hedjav (14 derniers jours).
            </p>
          </div>
          <Link href="/dashboard/alertes" style={subtleLink}>Toutes les alertes →</Link>
        </div>

        {recent.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>Rien de nouveau pour le moment.</p>
        ) : (
          <ul style={listReset}>
            {recent.map((r, i) => (
              <li key={i} style={listRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {r.type === 'ebook' ? '📚 ' : '✍️ '}
                    {r.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 'var(--s1)' }}>
                    {r.meta} · {fmtDate(r.date)}
                  </div>
                </div>
                <Link href={r.href} style={subtleLink}>Lire</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ value, label, small }: { value: string | number; label: string; small?: boolean }) {
  return (
    <div>
      <div
        className="hedjav-dash-stat-value"
        style={small ? { fontSize: 'var(--text-xl)' } : undefined}
      >
        {value || '—'}
      </div>
      <div className="hedjav-dash-stat-label">{label}</div>
    </div>
  )
}

const listReset = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column' as const,
}

const listRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--s4) 0',
  borderTop: '1px solid var(--border)',
  gap: 'var(--s4)',
}

const subtleLink = {
  fontFamily: 'var(--fb)',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--g700)',
  textDecoration: 'none' as const,
  whiteSpace: 'nowrap' as const,
}
