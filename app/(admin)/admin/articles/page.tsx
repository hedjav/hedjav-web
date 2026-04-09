import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { deleteArticleAction } from '@/lib/admin/actions'

export const metadata: Metadata = { title: 'Admin — Articles' }

export default async function AdminArticlesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, category, source, is_published, featured, quality_score, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 600, color: '#fff' }}>
          Articles
        </h1>
        <Link
          href="/admin/articles/new"
          style={{
            background: '#C5A028',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: 'var(--fb)',
            textDecoration: 'none',
          }}
        >
          + Nouvel article
        </Link>
      </div>

      <div
        style={{
          background: '#1B2A4A',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Titre</Th>
              <Th>Catégorie</Th>
              <Th>Source</Th>
              <Th>Score</Th>
              <Th>Statut</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(articles ?? []).map((a) => {
              const score = a.quality_score as number | null
              const scoreColor =
                score === null
                  ? '#6B82B0'
                  : score < 40
                    ? '#ff9b9b'
                    : score < 70
                      ? '#ffd966'
                      : '#5be58a'
              const scoreBg =
                score === null
                  ? 'rgba(255,255,255,.06)'
                  : score < 40
                    ? 'rgba(255,80,80,.15)'
                    : score < 70
                      ? 'rgba(255,200,0,.15)'
                      : 'rgba(46,179,108,.15)'

              return (
                <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <Td>
                    <div style={{ fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#6B82B0' }}>/{a.slug}</div>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: '#C2CEDE' }}>{a.category || '—'}</span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          a.source === 'ai'
                            ? 'rgba(139,92,246,.15)'
                            : 'rgba(59,130,246,.15)',
                        color: a.source === 'ai' ? '#a78bfa' : '#60a5fa',
                      }}
                    >
                      {a.source === 'ai' ? 'IA' : 'Manual'}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: scoreBg,
                        color: scoreColor,
                      }}
                    >
                      {score ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: a.is_published
                          ? 'rgba(46,179,108,.15)'
                          : 'rgba(255,255,255,.08)',
                        color: a.is_published ? '#5be58a' : 'rgba(255,255,255,.5)',
                      }}
                    >
                      {a.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: '#6B82B0' }}>
                      {new Date(a.created_at as string).toLocaleDateString('fr-FR')}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Link
                        href={`/admin/articles/${a.id}`}
                        style={{ color: '#C5A028', fontSize: 12, fontWeight: 600 }}
                      >
                        Éditer
                      </Link>
                      <form action={deleteArticleAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={a.id as string} />
                        <button
                          type="submit"
                          style={{
                            color: '#ff9b9b',
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontFamily: 'var(--fb)',
                          }}
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '14px 16px',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        color: '#6B82B0',
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '12px 16px', fontSize: 13 }}>{children}</td>
}
