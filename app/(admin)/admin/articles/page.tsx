import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { deleteArticleAction } from '@/lib/admin/actions'

export default async function AdminArticlesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, category, source, is_published, featured, quality_score, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff' }}>Articles</h1>
        <Link
          href="/admin/articles/new"
          style={{ background: '#C5A028', color: '#fff', padding: 'var(--s3) var(--s5)', borderRadius: 'var(--r8)', fontWeight: 600, fontSize: 'var(--text-sm)' }}
        >
          + Nouvel article
        </Link>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Titre</Th>
              <Th>Catégorie</Th>
              <Th>Source</Th>
              <Th>Score IA</Th>
              <Th>Statut</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(articles ?? []).map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.4)' }}>/{a.slug}</div>
                </Td>
                <Td>{a.category}</Td>
                <Td>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600,
                    background: a.source === 'ai' ? 'rgba(197,160,40,.15)' : 'rgba(255,255,255,.08)',
                    color: a.source === 'ai' ? '#C5A028' : 'rgba(255,255,255,.6)',
                  }}>
                    {a.source}
                  </span>
                </Td>
                <Td>{a.quality_score ?? '—'}</Td>
                <Td>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600,
                    background: a.is_published ? 'rgba(46,179,108,.15)' : 'rgba(255,255,255,.08)',
                    color: a.is_published ? '#5be58a' : 'rgba(255,255,255,.5)',
                  }}>
                    {a.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                    <Link href={`/admin/articles/${a.id}`} style={{ color: '#C5A028', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Éditer</Link>
                    <form action={deleteArticleAction}>
                      <input type="hidden" name="id" value={a.id as string} />
                      <button type="submit" style={{ color: '#ff9b9b', fontSize: 'var(--text-xs)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--fb)' }}>
                        Supprimer
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: 'left', padding: 'var(--s4) var(--s5)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{children}</th>
)
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: 'var(--s4) var(--s5)', fontSize: 'var(--text-sm)' }}>{children}</td>
)
