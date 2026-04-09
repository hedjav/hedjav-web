import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/invoices/queries'

/**
 * POST /api/invoices/generate
 * Protected by INTERNAL_API_TOKEN.
 * Body: { purchase_id }
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purchase_id } = await request.json()
  if (!purchase_id) {
    return NextResponse.json({ error: 'purchase_id requis' }, { status: 400 })
  }

  const invoice = await createInvoice(purchase_id)
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 })
  }

  return NextResponse.json({
    invoice_number: invoice.invoice_number,
    pdf_url: invoice.pdf_url,
  })
}
