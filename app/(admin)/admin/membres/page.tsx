import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = { title: 'Admin — Membres' }

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export default async function AdminMembresPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, country, role, newsletter_opt, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 32,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 32,
        }}
      >
        Membres ({profiles?.length ?? 0})
      </h1>

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
              <Th style={{ width: 50 }}></Th>
              <Th>Nom</Th>
              <Th>Email</Th>
              <Th>Pays</Th>
              <Th>Rôle</Th>
              <Th>Newsletter</Th>
              <Th>Inscrit le</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const isAdmin = p.role === 'admin'
              const initials = getInitials(p.full_name as string | null, p.email as string)

              return (
                <tr key={p.id as string} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <Td>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isAdmin
                          ? 'rgba(197,160,40,.2)'
                          : 'rgba(107,130,176,.15)',
                        color: isAdmin ? '#C5A028' : '#6B82B0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {initials}
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/membres/${p.id}`}
                      style={{ color: '#E0E6EF', fontWeight: 600, fontSize: 13 }}
                    >
                      {(p.full_name as string) ?? '—'}
                    </Link>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: '#C2CEDE' }}>{p.email}</span>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: '#6B82B0' }}>
                      {(p.country as string) ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isAdmin
                          ? 'rgba(197,160,40,.15)'
                          : 'rgba(255,255,255,.08)',
                        color: isAdmin ? '#C5A028' : 'rgba(255,255,255,.6)',
                      }}
                    >
                      {p.role}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: p.newsletter_opt
                          ? 'rgba(46,179,108,.15)'
                          : 'rgba(255,255,255,.06)',
                        color: p.newsletter_opt ? '#5be58a' : '#6B82B0',
                      }}
                    >
                      {p.newsletter_opt ? 'Oui' : 'Non'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: '#6B82B0' }}>
                      {new Date(p.created_at as string).toLocaleDateString('fr-FR')}
                    </span>
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

function Th({ children, style: extraStyle }: { children?: React.ReactNode; style?: React.CSSProperties }) {
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
        ...extraStyle,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '10px 16px', fontSize: 13 }}>{children}</td>
}
