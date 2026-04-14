import type { Metadata } from 'next'
import Link from 'next/link'
import { getNewArticlesSince, getNewEbooksSince } from '@/lib/dashboard/queries'
import { formatArticleDate } from '@/lib/articles/queries'

export const metadata: Metadata = { title: 'Mes alertes' }

export default async function AlertesPage() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 derniers jours
  const [articles, ebooks] = await Promise.all([
    getNewArticlesSince(since),
    getNewEbooksSince(since),
  ])

  return (
    <>
      <div style={{ marginBottom: 'var(--s10)' }}>
        <span className="eyebrow">Activité</span>
        <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
          Mes alertes
        </h1>
        <p style={{ marginTop: 'var(--s4)', color: 'var(--muted)', maxWidth: 640 }}>
          Retrouvez ici les derniers ebooks publiés et les nouveaux articles du blog Hedjav
          (30 derniers jours). Pour ne rien manquer, pensez aussi à la newsletter hebdomadaire.
        </p>
      </div>

      <section style={{ marginBottom: 'var(--s10)' }}>
        <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>
          Nouveaux ebooks ({ebooks.length})
        </h2>
        {ebooks.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            Pas de nouvel ebook ce mois-ci. Notre catalogue est enrichi régulièrement —
            vous serez notifié ici dès la prochaine sortie.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {ebooks.map((e) => (
              <li
                key={e.id}
                style={{
                  padding: 'var(--s4) var(--s5)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--s4)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--s1)' }}>{e.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Publié le {new Date(e.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Link href={`/ebooks/${e.slug}`} className="btn btn-gold btn-sm">Découvrir</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>
          Nouveaux articles ({articles.length})
        </h2>
        {articles.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            Pas de nouvel article ce mois-ci. En attendant, explorez les archives du blog,
            classées par thématique (BRVM, patrimoine, immobilier, IA…).
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {articles.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: 'var(--s4) var(--s5)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--s4)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="badge badge-gold" style={{ marginBottom: 'var(--s2)' }}>{a.category}</span>
                  <div style={{ fontWeight: 600, marginTop: 'var(--s2)' }}>{a.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 'var(--s1)' }}>
                    {formatArticleDate(a.published_at)}
                  </div>
                </div>
                <Link href={`/blog/${a.slug}`} className="btn btn-outline btn-sm">Lire</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
