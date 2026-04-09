import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/ventes/export
 * Generates a CSV of all sales. Protected by admin session.
 */
export async function GET() {
  // Auth check
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: purchases } = await db
    .from('purchases')
    .select('id, email, amount, status, created_at, ebook:ebooks(title)')
    .order('created_at', { ascending: false })

  const { data: invoices } = await db.from('invoices').select('purchase_id, invoice_number')
  const invoiceMap: Record<string, string> = {}
  for (const inv of invoices ?? []) {
    if (inv.purchase_id) invoiceMap[inv.purchase_id as string] = inv.invoice_number as string
  }

  // Get profiles for names
  const userEmails = [...new Set((purchases ?? []).map((p) => p.email as string))]
  const { data: profiles } = await db.from('profiles').select('email, full_name').in('email', userEmails)
  const nameMap: Record<string, string> = {}
  for (const pr of profiles ?? []) {
    if (pr.full_name) nameMap[pr.email as string] = pr.full_name as string
  }

  const BOM = '\uFEFF'
  const header = 'Date,Client,Email,Ebook,Montant (FCFA),Statut,Facture'
  const rows = (purchases ?? []).map((p) => {
    const date = new Date(p.created_at as string).toLocaleDateString('fr-FR')
    const client = nameMap[p.email as string] ?? ''
    const email = p.email as string
    const ebook = (p.ebook as { title?: string } | null)?.title ?? ''
    const amount = p.amount as number
    const status = p.status as string
    const invoice = invoiceMap[p.id as string] ?? ''
    return `${date},"${client}","${email}","${ebook}",${amount},${status},${invoice}`
  })

  const csv = BOM + [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
