import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = { title: 'Admin — Equipe' }

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
    .select('id, email, full_name, country, role, last_visit_at, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 'var(--s8)',
        }}
      >
        Equipe ({profiles?.length ?? 0})
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--s5)',
        }}
      >
        {(profiles ?? []).map((p) => {
          const initials = getInitials(p.full_name as string | null, p.email as string)
          return (
            <Link
              key={p.id as string}
              href={`/admin/membres/${p.id}`}
              style={{
                background: 'var(--admin-surface)',
                borderRadius: 12,
                border: '1px solid var(--admin-border)',
                padding: 'var(--s6)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textDecoration: 'none',
                transition: 'all .15s',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(197,160,40,.15)',
                  color: 'var(--admin-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--admin-text)', fontSize: 14 }}>
                  {(p.full_name as string) ?? '\u2014'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                  Derniere visite : {p.last_visit_at ? new Date(p.last_visit_at as string).toLocaleDateString('fr-FR') : 'Jamais'}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
