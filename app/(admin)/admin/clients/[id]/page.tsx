import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Admin — Fiche client' }

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

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = db()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!profile) notFound()

  const p = profile as Profile

  const [{ data: purchases }, { data: subData }] = await Promise.all([
    supabase
      .from('purchases')
      .select('id, amount, status, created_at, ebook:ebooks(title)')
      .eq('email', p.email)
      .order('created_at', { ascending: false }),
    supabase
      .from('newsletter_subscribers')
      .select('email, source, is_active, subscribed_at')
      .eq('email', p.email)
      .maybeSingle(),
  ])

  const initials = getInitials(p.full_name, p.email)

  return (
    <>
      <Link
        href="/admin/clients"
        style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 24, display: 'inline-block' }}
      >
        {'\u2190'} Retour aux clients
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(197,160,40,.15)',
            color: 'var(--admin-accent)',
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
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <InfoCard label="Pays" value={p.country ?? '\u2014'} />
        <InfoCard label="Telephone" value={p.phone ?? '\u2014'} />
        <InfoCard label="Newsletter" value={subData ? (subData.is_active ? 'Actif' : 'Desabonne') : (p.newsletter_opt ? 'Opt-in' : 'Non')} />
        <InfoCard label="Source newsletter" value={(subData?.source as string) ?? '\u2014'} />
        <InfoCard label="Derniere visite" value={p.last_visit_at ? new Date(p.last_visit_at).toLocaleDateString('fr-FR') : 'Jamais'} />
        <InfoCard label="Inscrit le" value={new Date(p.created_at).toLocaleDateString('fr-FR')} />
      </div>

      {/* Purchases */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, padding: 24, border: '1px solid var(--admin-border)', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--admin-text)', marginBottom: 16 }}>
          Achats ({purchases?.length ?? 0})
        </h2>
        {(purchases ?? []).length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucun achat</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
            <thead>
              <tr>
                {['Ebook', 'Montant', 'Statut', 'Date'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).map((pu) => (
                <tr key={pu.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {(pu.ebook as { title?: string } | null)?.title ?? '\u2014'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontFamily: 'var(--fm)' }}>
                    {formatFcfa(pu.amount as number)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: pu.status === 'paid' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)',
                      color: pu.status === 'paid' ? 'var(--admin-success)' : 'var(--admin-warning)',
                    }}>
                      {pu.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    {new Date(pu.created_at as string).toLocaleDateString('fr-FR')}
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
    <div style={{ background: 'var(--admin-surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--admin-border)' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)' }}>{value}</div>
    </div>
  )
}
