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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 28,
            fontWeight: 600,
            color: '#fff',
          }}
        >
          Pages
        </h1>
      </div>

      <div
        style={{
          background: '#1B2A4A',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--fb)', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6B82B0', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Titre
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6B82B0', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Slug
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6B82B0', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Dernière modification
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'right', color: '#6B82B0', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: '#6B82B0' }}>
                  Aucune page trouvée. Créez les pages légales dans Supabase (table pages).
                </td>
              </tr>
            )}
            {pages.map((page) => (
              <tr key={page.slug} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: '12px 20px', color: '#E0E6EF', fontWeight: 500 }}>
                  {page.title}
                </td>
                <td style={{ padding: '12px 20px', color: '#6B82B0', fontFamily: 'var(--fm)' }}>
                  /{page.slug}
                </td>
                <td style={{ padding: '12px 20px', color: '#6B82B0' }}>
                  {page.updated_at
                    ? new Date(page.updated_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <Link
                    href={`/admin/pages/${page.slug}`}
                    style={{
                      color: '#C5A028',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
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
