import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyFedaPaySignature } from '@/lib/fedapay/verify'
import { sendEmail } from '@/lib/email/smtp'
import { purchaseConfirmationEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'

/**
 * POST /api/webhooks/fedapay
 *
 * Reçoit les notifications de FedaPay (HMAC-SHA256 signé).
 * Met à jour la purchase correspondante et envoie l'email de confirmation
 * + facture + notification admin.
 *
 * Retourne toujours 200 pour éviter les retries FedaPay.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-fedapay-signature')

  if (!verifyFedaPaySignature(rawBody, signature)) {
    console.warn('[fedapay webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: {
    name?: string
    entity?: {
      id?: number | string
      reference?: string
      amount?: number
      status?: string
      customer?: { email?: string }
      payment_method?: string
    }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const entity = payload.entity
  if (!entity?.id && !entity?.reference) {
    return NextResponse.json({ ok: true })
  }

  // Determine new status
  const eventName = payload.name ?? ''
  const entityStatus = entity.status ?? ''
  let newStatus: 'paid' | 'failed' | 'pending' = 'pending'
  if (eventName.includes('approved') || entityStatus === 'approved') {
    newStatus = 'paid'
  } else if (
    eventName.includes('declined') || eventName.includes('canceled') ||
    entityStatus === 'declined' || entityStatus === 'canceled'
  ) {
    newStatus = 'failed'
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Match by payment_ref = entity.id (string) OR entity.reference
  const refStr = String(entity.id ?? '')
  const reference = entity.reference ?? ''

  // Try matching by id first, then by reference
  let purchase: Record<string, unknown> | null = null

  if (refStr) {
    const { data } = await supabase
      .from('purchases')
      .update({
        status: newStatus,
        payment_method: entity.payment_method ?? null,
        raw_payload: payload,
      })
      .eq('payment_ref', refStr)
      .select('*, ebook:ebooks(title, slug)')
      .maybeSingle()
    purchase = data
  }

  if (!purchase && reference) {
    const { data } = await supabase
      .from('purchases')
      .update({
        status: newStatus,
        payment_method: entity.payment_method ?? null,
        raw_payload: payload,
      })
      .eq('payment_ref', reference)
      .select('*, ebook:ebooks(title, slug)')
      .maybeSingle()
    purchase = data
  }

  if (!purchase) {
    console.warn('[fedapay webhook] purchase not found for ref', refStr, reference)
    return NextResponse.json({ ok: true, ignored: true })
  }

  // Post-payment actions if paid
  if (newStatus === 'paid' && purchase.email) {
    const ebookTitle = (purchase.ebook as { title?: string; slug?: string } | null)?.title ?? 'votre ebook'
    const amount = (purchase.amount as number) ?? 0

    // Email de confirmation
    const tpl = purchaseConfirmationEmail('', ebookTitle, amount)
    await sendEmail({
      to: purchase.email as string,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    })

    // Notification admin
    createNotification(
      'purchase',
      'Nouvel achat',
      `${ebookTitle} par ${purchase.email} — ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`,
    ).catch((e) => console.error('[fedapay] notification failed', e))

    // Générer facture
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'}/api/invoices/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` },
      body: JSON.stringify({ purchase_id: purchase.id }),
    }).catch((e) => console.error('[fedapay] invoice generation failed', e))
  }

  return NextResponse.json({ ok: true })
}
