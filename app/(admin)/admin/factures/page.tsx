import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { FacturesClient } from './FacturesClient'

export const metadata: Metadata = { title: 'Admin — Factures' }

export default async function AdminFacturesPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await db
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const invoices = (data ?? []) as Array<{
    id: string
    invoice_number: string
    user_email: string
    user_name: string | null
    ebook_title: string
    amount: number
    currency: string
    status: string
    pdf_url: string | null
    created_at: string
  }>

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Factures
      </h1>
      <FacturesClient invoices={invoices} />
    </>
  )
}
