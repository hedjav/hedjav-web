import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'
import { MemberRoleButtons } from './MemberRoleButtons'

export const metadata: Metadata = { title: 'Admin — Fiche membre' }

type PageProps = { params: Promise<{ id: string }> }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = db()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!profile) notFound()

  const p = profile as Profile

  const [{ data: purchases }, { data: sends }] = await Promise.all([
    supabase
      .from('purchases')
      .select('id, amount, status, created_at, ebook:ebooks(title)')
      .eq('email', p.email)
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_sends')
      .select('id, status, sent_at, campaign_email:campaign_emails(subject)')
      .eq('subscriber_email', p.email)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const isAdmin = p.role === 'admin'
  const initials = getInitials(p.full_name, p.email)

  return (
    <>
      <Link
        href="/admin/membres"
        style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 24, display: 'inline-block' }}
      >
        ← Retour aux membres
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: isAdmin ? 'rgba(197,160,40,.2)' : 'rgba(107,130,176,.15)',
            color: isAdmin ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 600, color: 'var(--admin-text)', margin: 0 }}>
            {p.full_name ?? p.email}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>{p.email}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <MemberRoleButtons userId={p.id} isAdmin={isAdmin} userName={p.full_name ?? p.email} />
        </div>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <InfoCard label="Pays" value={p.country ?? '\u2014'} />
        <InfoCard label="Role" value={p.role} />
        <InfoCard label="Newsletter" value={p.newsletter_opt ? 'Abonne' : 'Non abonne'} />
        <InfoCard
          label="Derniere visite"
          value={
            p.last_visit_at
              ? new Date(p.last_visit_at).toLocaleDateString('fr-FR')
              : 'Jamais'
          }
        />
        <InfoCard
          label="Inscrit le"
          value={new Date(p.created_at).toLocaleDateString('fr-FR')}
        />
        <InfoCard label="Telephone" value={p.phone ?? '\u2014'} />
      </div>

      {/* Purchases */}
      <div
        style={{
          background: 'var(--admin-surface)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--admin-border)',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--admin-text)', marginBottom: 16 }}>
          Achats ({purchases?.length ?? 0})
        </h2>
        {(purchases ?? []).length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucun achat</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
            <thead>
              <tr>
                <th style={thStyle}>Ebook</th>
                <th style={thStyle}>Montant</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).map((pu) => (
                <tr key={pu.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={tdStyle}>
                    {(pu.ebook as { title?: string } | null)?.title ?? '\u2014'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--fm)' }}>
                      {(pu.amount as number).toLocaleString('fr-FR')} F
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          pu.status === 'paid'
                            ? 'rgba(46,179,108,.15)'
                            : 'rgba(255,200,0,.15)',
                        color: pu.status === 'paid' ? 'var(--admin-success)' : 'var(--admin-warning)',
                      }}
                    >
                      {pu.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {new Date(pu.created_at as string).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Campaign sends */}
      <div
        style={{
          background: 'var(--admin-surface)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--admin-border)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--admin-text)', marginBottom: 16 }}>
          Emails de campagne ({sends?.length ?? 0})
        </h2>
        {(sends ?? []).length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucun email envoye</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
            <thead>
              <tr>
                <th style={thStyle}>Sujet</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Envoye le</th>
              </tr>
            </thead>
            <tbody>
              {(sends ?? []).map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={tdStyle}>
                    {(s.campaign_email as { subject?: string } | null)?.subject ?? '\u2014'}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          s.status === 'opened' || s.status === 'clicked'
                            ? 'rgba(46,179,108,.15)'
                            : s.status === 'sent'
                              ? 'rgba(59,130,246,.15)'
                              : 'var(--admin-border)',
                        color:
                          s.status === 'opened' || s.status === 'clicked'
                            ? 'var(--admin-success)'
                            : s.status === 'sent'
                              ? 'var(--admin-info)'
                              : 'var(--admin-text-muted)',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {s.sent_at
                        ? new Date(s.sent_at as string).toLocaleDateString('fr-FR')
                        : '\u2014'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--admin-text-muted)',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)' }}>{value}</div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left' as const,
  padding: '10px 16px',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.1em',
  color: 'var(--admin-text-muted)',
  fontWeight: 600,
}

const tdStyle = {
  padding: '10px 16px',
  fontSize: 13,
}
