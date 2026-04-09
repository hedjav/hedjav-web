import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/smtp'
import { newsletterSubscribedEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'
import { normalizeEmail } from '@/lib/utils/validation'

/**
 * POST /api/newsletter/subscribe
 * Body : { email, source?, first_name?, type?: 'editorial'|'lead_magnet', phone?, ebook_id? }
 *
 * Insère l'email dans la table newsletter_subscribers.
 * Idempotent : upsert sur email (réactive si déjà présent).
 * Si l'utilisateur est connecté -> met aussi à jour profile.newsletter_opt = true.
 */
export async function POST(request: Request) {
  let payload: {
    email?: string
    source?: string
    first_name?: string
    type?: 'editorial' | 'lead_magnet'
    phone?: string
    ebook_id?: string
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawEmail = payload.email?.trim().toLowerCase()
  if (!rawEmail || !rawEmail.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const emailNormalized = normalizeEmail(rawEmail)

  // Service role pour bypass RLS sur upsert
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Déterminer le tag depuis la source
  const source = payload.source ?? 'web'
  const tagMap: Record<string, string> = { popup_ia: 'ia', popup_brvm: 'brvm', popup_patrimoine: 'patrimoine' }
  const tag = tagMap[source]

  // Check if already subscribed and active
  const { data: existing } = await admin
    .from('newsletter_subscribers')
    .select('email, is_active')
    .eq('email', emailNormalized)
    .maybeSingle()

  const alreadySubscribed = existing?.is_active === true

  const { error } = await admin
    .from('newsletter_subscribers')
    .upsert(
      {
        email: emailNormalized,
        source,
        first_name: payload.first_name ?? null,
        is_active: true,
        unsubscribed_at: null,
        ...(tag ? { tags: [tag] } : {}),
        ...(payload.type ? { subscriber_type: payload.type } : {}),
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.ebook_id ? { lead_magnet_ebook_id: payload.ebook_id } : {}),
      },
      { onConflict: 'email' },
    )

  if (error) {
    console.error('[newsletter] insert failed', error)
    // Message clair selon la cause probable
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      return NextResponse.json(
        {
          error: 'Table newsletter_subscribers manquante. Exécute supabase/migrations/009_newsletter_subscribers.sql dans Supabase Dashboard.',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si déjà inscrit et actif, retourner tôt
  if (alreadySubscribed) {
    return NextResponse.json({ ok: true, alreadySubscribed: true, message: 'Vous êtes déjà inscrit !' }, { status: 200 })
  }

  // Enrôlement automatique dans une campagne welcome active si tags correspondent
  try {
    const { data: activeCampaigns } = await admin
      .from('campaigns')
      .select('id, target_tags')
      .eq('type', 'welcome_sequence')
      .eq('status', 'active')
      .limit(1)

    if (activeCampaigns && activeCampaigns.length > 0) {
      const campaign = activeCampaigns[0]
      const campaignTags = (campaign.target_tags as string[]) ?? []
      const shouldEnroll = campaignTags.length === 0 || (tag && campaignTags.includes(tag))
      if (shouldEnroll) {
        await admin
          .from('newsletter_subscribers')
          .update({ enrolled_campaign_id: campaign.id, campaign_step: 0 })
          .eq('email', emailNormalized)
      }
    }
  } catch (e) {
    console.error('[newsletter] campaign enrollment failed', e)
  }

  // Email de bienvenue (no-op si SMTP_HOST non configuré)
  const tpl = newsletterSubscribedEmail(payload.first_name ?? '')
  sendEmail({ to: rawEmail, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch((e) => {
    console.error('[newsletter] welcome email failed', e)
  })

  // Si l'utilisateur est connecté, on met aussi à jour son profil
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await admin
        .from('profiles')
        .update({ newsletter_opt: true })
        .eq('id', user.id)
    }
  } catch (e) {
    console.error('[newsletter] profile update failed', e)
  }

  // Notification admin
  createNotification('subscriber', 'Nouvel abonne newsletter', rawEmail).catch((e) => {
    console.error('[newsletter] notification failed', e)
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
