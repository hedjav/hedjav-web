import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyFedaPaySignature } from '@/lib/fedapay/verify'
import { sendEmail } from '@/lib/email/sender'

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
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/mes-ebooks`

    await sendEmail({
      to: purchase.email,
      subject: `Votre achat Hedjav est confirmé — ${ebookTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1B2A4A;">Merci pour votre achat 🎉</h2>
          <p>Votre paiement pour <strong>${ebookTitle}</strong> a bien été enregistré.</p>
          <p>Vous pouvez télécharger votre ebook depuis votre espace membre :</p>
          <p style="margin: 24px 0;">
            <a href="${downloadUrl}" style="background:#C5A028;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Accéder à mon ebook
            </a>
          </p>
          <p style="color:#666;font-size:14px;">
            Si le bouton ne fonctionne pas, copiez ce lien : ${downloadUrl}
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
          <p style="color:#999;font-size:12px;">Hedjav — École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
