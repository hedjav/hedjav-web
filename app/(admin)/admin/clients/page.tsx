import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ClientsTable } from './ClientsTable'

export const metadata: Metadata = { title: 'Admin — Clients' }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function AdminClientsPage() {
  const supabase = db()

  const [{ data: profiles }, { data: purchases }, { data: subs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, country, phone, newsletter_opt, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('purchases')
      .select('email, amount, status')
      .eq('status', 'paid'),
    supabase
      .from('newsletter_subscribers')
      .select('email, is_active'),
  ])

  // Build purchase stats per email
  const purchaseMap: Record<string, { count: number; total: number }> = {}
  for (const p of purchases ?? []) {
    const email = p.email as string
    if (!purchaseMap[email]) purchaseMap[email] = { count: 0, total: 0 }
    purchaseMap[email].count += 1
    purchaseMap[email].total += p.amount as number
  }

  // Build newsletter status per email
  const newsletterMap: Record<string, boolean> = {}
  for (const s of subs ?? []) {
    newsletterMap[s.email as string] = s.is_active as boolean
  }

  const rows = (profiles ?? []).map((p) => {
    const email = p.email as string
    const stats = purchaseMap[email] ?? { count: 0, total: 0 }
    return {
      id: p.id as string,
      full_name: (p.full_name as string) ?? '',
      email,
      country: (p.country as string) ?? '',
      nb_achats: stats.count,
      ca_total: stats.total,
      newsletter: p.newsletter_opt as boolean || newsletterMap[email] === true,
      created_at: p.created_at as string,
    }
  })

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 'var(--s8)' }}>
        Clients ({rows.length})
      </h1>
      <ClientsTable rows={rows} />
    </>
  )
}
