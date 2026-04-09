import { createClient } from '@supabase/supabase-js'
import { generateInvoicePDF } from './generate-pdf'
import type { Invoice } from '@/lib/supabase/types'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Creates an invoice for a purchase:
 * 1. Generates invoice number via DB function
 * 2. Generates PDF
 * 3. Uploads PDF to Supabase Storage (bucket: invoices)
 * 4. Inserts invoice record
 */
export async function createInvoice(purchaseId: string): Promise<Invoice | null> {
  const db = getDb()

  // Fetch purchase + ebook + profile
  const { data: purchase, error: pErr } = await db
    .from('purchases')
    .select('*, ebook:ebooks(title)')
    .eq('id', purchaseId)
    .maybeSingle()

  if (pErr || !purchase) {
    console.error('[invoices] purchase not found', purchaseId, pErr)
    return null
  }

  // Check if invoice already exists for this purchase
  const { data: existing } = await db
    .from('invoices')
    .select('*')
    .eq('purchase_id', purchaseId)
    .maybeSingle()

  if (existing) return existing as Invoice

  // Generate invoice number
  const { data: numData, error: numErr } = await db.rpc('generate_invoice_number')
  if (numErr || !numData) {
    console.error('[invoices] failed to generate number', numErr)
    return null
  }
  const invoiceNumber = numData as string

  // Get user profile if user_id exists
  let userName: string | null = null
  if (purchase.user_id) {
    const { data: profile } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', purchase.user_id)
      .maybeSingle()
    userName = profile?.full_name ?? null
  }

  const ebookTitle = (purchase.ebook as { title?: string } | null)?.title ?? 'Ebook'
  const amount = purchase.amount as number

  // Generate PDF
  const pdfBuffer = generateInvoicePDF({
    invoice_number: invoiceNumber,
    date: new Date(purchase.created_at as string),
    user_name: userName,
    user_email: purchase.email as string,
    ebook_title: ebookTitle,
    amount,
  })

  // Upload PDF to Supabase Storage
  const pdfPath = `${invoiceNumber}.pdf`
  const { error: uploadErr } = await db.storage
    .from('invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr) {
    console.error('[invoices] upload failed', uploadErr)
  }

  // Get signed URL (valid 10 years)
  const { data: urlData } = await db.storage
    .from('invoices')
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 365 * 10)

  const pdfUrl = urlData?.signedUrl ?? null

  // Insert invoice record
  const { data: invoice, error: insertErr } = await db
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      purchase_id: purchaseId,
      user_id: purchase.user_id ?? null,
      user_email: purchase.email as string,
      user_name: userName,
      ebook_title: ebookTitle,
      amount,
      currency: (purchase.currency as string) ?? 'XOF',
      status: 'paid',
      company_name: 'KTALYZ SARL',
      company_address: 'Cotonou, Benin',
      company_rccm: 'RB/COT/24 B 12345',
      company_ifu: '3202400000000',
      company_phone: '+229 01 97 89 03 630',
      pdf_url: pdfUrl,
    })
    .select('*')
    .single()

  if (insertErr) {
    console.error('[invoices] insert failed', insertErr)
    return null
  }

  return invoice as Invoice
}

export async function getInvoicesByUser(userId: string): Promise<Invoice[]> {
  const db = getDb()
  const { data } = await db
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Invoice[]
}

export async function getInvoiceByPurchase(purchaseId: string): Promise<Invoice | null> {
  const db = getDb()
  const { data } = await db
    .from('invoices')
    .select('*')
    .eq('purchase_id', purchaseId)
    .maybeSingle()
  return (data as Invoice) ?? null
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = getDb()
  const { data } = await db
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Invoice[]
}
