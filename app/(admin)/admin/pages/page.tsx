import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata = {
  title: 'Pages — Admin Hedjav',
}

async function getPages() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await db
    .from('pages')
    .select('slug, title, updated_at')
    .order('title', { ascending: true })
  return data ?? []
}

export default async function AdminPagesPage() {
  const pages = await getPages()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
          Pages legales
        </h1>
      </div>

      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--admin-text)' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Titre', 'Slug', 'Derniere modification', 'Action'].map((h, i) => (
                <th key={h} style={{ padding: '12px 20px', textAlign: i === 3 ? 'right' : 'left', color: 'var(--admin-text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  Aucune page trouvee.
                </td>
              </tr>
            )}
            {pages.map((page) => (
              <tr key={page.slug} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500 }}>{page.title}</td>
                <td style={{ padding: '12px 20px', color: 'var(--admin-text-muted)', fontFamily: 'var(--fm)' }}>/{page.slug}</td>
                <td style={{ padding: '12px 20px', color: 'var(--admin-text-muted)' }}>
                  {page.updated_at
                    ? new Date(page.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '\u2014'}
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <Link href={`/admin/pages/${page.slug}`} style={{ color: 'var(--admin-accent)', fontWeight: 600, fontSize: 12 }}>
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
