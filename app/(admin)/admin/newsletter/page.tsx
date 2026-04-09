import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { NewsletterTable } from './NewsletterTable'

export const metadata: Metadata = { title: 'Admin — Abonnes newsletter' }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function AdminNewsletterPage() {
  const supabase = db()

  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })

  const all = (subscribers ?? []) as Array<{
    id: string
    email: string
    first_name: string | null
    phone: string | null
    source: string | null
    is_active: boolean
    unsubscribed_at: string | null
    subscribed_at: string
    metadata: Record<string, unknown>
  }>

  const totalActive = all.filter((s) => s.is_active).length
  const totalInactive = all.filter((s) => !s.is_active).length
  const editorialOnly = all.filter((s) => s.is_active && s.source === 'editorial').length
  const leadMagnetOnly = all.filter((s) => s.is_active && s.source === 'lead_magnet').length

  const stats = [
    { label: 'Total actifs', value: totalActive, color: 'var(--admin-success)' },
    { label: 'Editorial', value: editorialOnly, color: 'var(--admin-info)' },
    { label: 'Lead magnet', value: leadMagnetOnly, color: 'var(--admin-accent)' },
    { label: 'Desinscrits', value: totalInactive, color: 'var(--admin-danger)' },
  ]

  const rows = all.map((s) => ({
    id: s.id,
    email: s.email,
    first_name: s.first_name ?? '',
    phone: s.phone ?? '',
    source: s.source ?? 'unknown',
    is_active: s.is_active,
    subscribed_at: s.subscribed_at,
  }))

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 'var(--s6)' }}>
        Abonnes newsletter
      </h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s5)', marginBottom: 'var(--s8)' }}>
        {stats.map((c) => (
          <div
            key={c.label}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 12,
              border: '1px solid var(--admin-border)',
              padding: 'var(--s5)',
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--admin-text-muted)', marginBottom: 'var(--s2)' }}>
              {c.label}
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 'var(--text-3xl)', color: c.color, fontWeight: 700 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <NewsletterTable rows={rows} />
    </>
  )
}
