import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/smtp'
import { purchaseConfirmationEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'

/**
 * POST /api/webhooks/fedapay
 *
 * Reçoit les notifications de FedaPay.
 *
 * SÉCURITÉ : on vérifie la transaction côté serveur via l'API FedaPay
 * au lieu de la signature HMAC (format non documenté par FedaPay).
 * L'URL du webhook est elle-même secrète.
 *
 * Retourne toujours 200 pour éviter les retries FedaPay.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()

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
    console.error('[fedapay webhook] invalid JSON body')
    return NextResponse.json({ ok: true })
  }

  const entity = payload.entity
  if (!entity?.id && !entity?.reference) {
    console.warn('[fedapay webhook] no entity id or reference')
    return NextResponse.json({ ok: true })
  }

  console.log('[fedapay webhook] received event:', payload.name, 'entity id:', entity.id, 'status:', entity.status)

  // Vérification côté serveur : on confirme le statut via l'API FedaPay
  // plutôt que de faire confiance au payload seul
  let verifiedStatus: string | null = null
  try {
    const apiKey = process.env.FEDAPAY_API_KEY
    if (apiKey && entity.id) {
      const res = await fetch(`https://api.fedapay.com/v1/transactions/${entity.id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      if (res.ok) {
        const data = await res.json()
        verifiedStatus = data?.v1_transaction?.status ?? data?.status ?? null
        console.log('[fedapay webhook] API verification:', verifiedStatus)
      } else {
        console.warn('[fedapay webhook] API verification failed:', res.status)
      }
    }
  } catch (e) {
    console.warn('[fedapay webhook] API verification error:', e)
  }

  // Utilise le statut vérifié par l'API, ou à défaut celui du payload
  const effectiveStatus = verifiedStatus ?? entity.status ?? ''
  const eventName = payload.name ?? ''

  let newStatus: 'paid' | 'failed' | 'pending' = 'pending'
  if (effectiveStatus === 'approved' || eventName.includes('approved')) {
    newStatus = 'paid'
  } else if (
    effectiveStatus === 'declined' || effectiveStatus === 'canceled' ||
    eventName.includes('declined') || eventName.includes('canceled')
  ) {
    newStatus = 'failed'
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Match par payment_ref (= transaction id en string)
  const refStr = String(entity.id ?? '')
  const reference = entity.reference ?? ''

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
    console.warn('[fedapay webhook] purchase not found for ref', refStr, 'or', reference)
    return NextResponse.json({ ok: true, ignored: true })
  }

  console.log('[fedapay webhook] purchase updated:', purchase.id, '→', newStatus)

  // Actions post-paiement
  if (newStatus === 'paid' && purchase.email) {
    const ebookTitle = (purchase.ebook as { title?: string } | null)?.title ?? 'votre ebook'
    const amount = (purchase.amount as number) ?? 0

    // Email de confirmation
    const tpl = purchaseConfirmationEmail('', ebookTitle, amount)
    sendEmail({
      to: purchase.email as string,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    }).catch((e) => console.error('[fedapay] email failed', e))

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
