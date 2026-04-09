import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { deleteEbookAction } from '@/lib/admin/actions'
import { formatPriceFcfa } from '@/lib/ebooks/queries'

export const metadata: Metadata = { title: 'Admin — Ebooks' }

export default async function AdminEbooksPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: ebooks } = await supabase
    .from('ebooks')
    .select('id, title, slug, price, cover_image_url, is_published, is_featured, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 600, color: '#fff' }}>
          Ebooks
        </h1>
        <Link
          href="/admin/ebooks/new"
          style={{
            background: '#C5A028',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontFamily: 'var(--fb)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + Nouvel ebook
        </Link>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Cover</Th>
              <Th>Titre</Th>
              <Th>Prix</Th>
              <Th>Statut</Th>
              <Th>Featured</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(ebooks ?? []).map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <Td>
                  {e.cover_image_url ? (
                    <img
                      src={e.cover_image_url}
                      alt=""
                      style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 56,
                        background: 'rgba(255,255,255,.06)',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: '#6B82B0',
                      }}
                    >
                      📖
                    </div>
                  )}
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: '#6B82B0' }}>/{e.slug}</div>
                </Td>
                <Td>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>
                    {formatPriceFcfa(e.price as number)}
                  </span>
                </Td>
                <Td>
                  <Badge
                    active={e.is_published as boolean}
                    label={e.is_published ? 'Publié' : 'Brouillon'}
                  />
                </Td>
                <Td>
                  {e.is_featured ? (
                    <span style={{ color: '#C5A028', fontSize: 14 }}>★</span>
                  ) : (
                    <span style={{ color: '#6B82B0' }}>—</span>
                  )}
                </Td>
                <Td>
                  <span style={{ fontSize: 12, color: '#6B82B0' }}>
                    {new Date(e.created_at as string).toLocaleDateString('fr-FR')}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link
                      href={`/admin/ebooks/${e.id}`}
                      style={{ color: '#C5A028', fontSize: 12, fontWeight: 600 }}
                    >
                      Éditer
                    </Link>
                    <form action={deleteEbookAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={e.id as string} />
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
            ))}
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

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: active ? 'rgba(46,179,108,.15)' : 'rgba(255,255,255,.08)',
        color: active ? '#5be58a' : 'rgba(255,255,255,.5)',
      }}
    >
      {label}
    </span>
  )
}
