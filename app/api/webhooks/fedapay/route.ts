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
 * + lien de téléchargement ebook.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-fedapay-signature')

  if (!verifyFedaPaySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: {
    name?: string
    entity?: {
      id?: string
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entity = payload.entity
  if (!entity?.reference || !entity?.id) {
    return NextResponse.json({ error: 'Missing entity data' }, { status: 400 })
  }

  const eventName = payload.name ?? ''
  const newStatus =
    eventName.includes('approved') || entity.status === 'approved'
      ? 'paid'
      : eventName.includes('declined') || entity.status === 'declined'
      ? 'failed'
      : 'pending'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: purchase, error } = await supabase
    .from('purchases')
    .update({
      status: newStatus,
      payment_method: entity.payment_method ?? null,
      raw_payload: payload,
    })
    .eq('payment_ref', entity.reference)
    .select('*, ebook:ebooks(title, slug)')
    .maybeSingle()

  if (error) {
    console.error('[fedapay webhook] update failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!purchase) {
    console.warn('[fedapay webhook] purchase not found for ref', entity.reference)
    return NextResponse.json({ ok: true, ignored: true })
  }

  // Email de confirmation si paiement validé
  if (newStatus === 'paid' && purchase.email) {
    const ebookTitle = (purchase.ebook as { title?: string } | null)?.title ?? 'votre ebook'
    const amount = purchase.amount as number ?? 0
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
