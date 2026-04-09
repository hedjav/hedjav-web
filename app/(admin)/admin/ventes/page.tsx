import { createClient } from '@supabase/supabase-js'
import { formatPriceFcfa } from '@/lib/ebooks/queries'
import { VentesClient } from './VentesClient'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function AdminVentesPage() {
  const db = getDb()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [purchasesRes, monthRes, invoicesRes] = await Promise.all([
    db
      .from('purchases')
      .select('id, email, amount, status, payment_method, payment_ref, created_at, user_id, ebook:ebooks(title)')
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('purchases')
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', startOfMonth),
    db.from('invoices').select('purchase_id, invoice_number, pdf_url'),
  ])

  const purchases = purchasesRes.data ?? []
  const totalPaid = purchases
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount as number), 0)
  const monthTotal = (monthRes.data ?? []).reduce((sum, p) => sum + (p.amount as number), 0)
  const nbSales = purchases.filter((p) => p.status === 'paid').length

  const invoiceMap: Record<string, { number: string; url: string | null }> = {}
  for (const inv of invoicesRes.data ?? []) {
    if (inv.purchase_id) {
      invoiceMap[inv.purchase_id as string] = {
        number: inv.invoice_number as string,
        url: inv.pdf_url as string | null,
      }
    }
  }

  const userIds = [...new Set(purchases.filter((p) => p.user_id).map((p) => p.user_id as string))]
  const nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    for (const pr of profiles ?? []) {
      if (pr.full_name) nameMap[pr.id as string] = pr.full_name as string
    }
  }

  const rows = purchases.map((p) => ({
    id: p.id as string,
    date: p.created_at as string,
    clientName: nameMap[p.user_id as string] ?? null,
    email: p.email as string,
    ebook: (p.ebook as { title?: string } | null)?.title ?? '\u2014',
    amount: p.amount as number,
    status: p.status as string,
    invoice: invoiceMap[p.id as string] ?? null,
  }))

  const stats = [
    { label: 'CA total', value: formatPriceFcfa(totalPaid), color: 'var(--admin-accent)' },
    { label: 'CA ce mois', value: formatPriceFcfa(monthTotal), color: 'var(--admin-info)' },
    { label: 'Nombre de ventes', value: nbSales.toString(), color: 'var(--admin-success)' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>Ventes</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s5)', marginBottom: 'var(--s8)' }}>
        {stats.map((c) => (
          <div
            key={c.label}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 12,
              border: '1px solid var(--admin-border)',
              padding: 'var(--s6)',
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

      <VentesClient rows={rows} />
    </>
  )
}
