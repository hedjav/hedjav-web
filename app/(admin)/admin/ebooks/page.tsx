import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { deleteEbookAction } from '@/lib/admin/actions'
import { formatPriceFcfa } from '@/lib/ebooks/queries'

export default async function AdminEbooksPage() {
  const supabase = await createSupabaseServerClient()
  const { data: ebooks } = await supabase
    .from('ebooks')
    .select('id, title, slug, price, is_published, is_featured, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff' }}>Ebooks</h1>
        <Link
          href="/admin/ebooks/new"
          style={{
            background: '#C5A028',
            color: '#fff',
            padding: 'var(--s3) var(--s5)',
            borderRadius: 'var(--r8)',
            fontFamily: 'var(--fb)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
          }}
        >
          + Nouvel ebook
        </Link>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Titre</Th>
              <Th>Prix</Th>
              <Th>Statut</Th>
              <Th>Featured</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(ebooks ?? []).map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.4)' }}>/{e.slug}</div>
                </Td>
                <Td>{formatPriceFcfa(e.price as number)}</Td>
                <Td>
                  <Badge active={e.is_published as boolean} label={e.is_published ? 'Publié' : 'Brouillon'} />
                </Td>
                <Td>{e.is_featured ? '★' : '—'}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 'var(--s3)' }}>
                    <Link href={`/admin/ebooks/${e.id}`} style={linkStyle}>Éditer</Link>
                    <form action={deleteEbookAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={e.id as string} />
                      <button type="submit" style={dangerLinkStyle}>Supprimer</button>
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
const Badge = ({ active, label }: { active: boolean; label: string }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600,
    background: active ? 'rgba(46,179,108,.15)' : 'rgba(255,255,255,.08)',
    color: active ? '#5be58a' : 'rgba(255,255,255,.5)',
  }}>{label}</span>
)
const linkStyle = { color: '#C5A028', fontSize: 'var(--text-xs)', fontWeight: 600 } as const
const dangerLinkStyle = { ...linkStyle, color: '#ff9b9b', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--fb)' } as const
