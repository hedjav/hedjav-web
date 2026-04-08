import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sender'
import { welcomeNewsletterEmail } from '@/lib/email/templates'

/**
 * POST /api/newsletter/subscribe
 * Body : { email, source?: 'home' | 'article' | 'footer' | 'register' }
 *
 * Insère l'email dans la table newsletter_subscribers.
 * Idempotent : upsert sur email (réactive si déjà présent).
 * Si l'utilisateur est connecté → met aussi à jour profile.newsletter_opt = true.
 */
export async function POST(request: Request) {
  let payload: { email?: string; source?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = payload.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  // Service role pour bypass RLS sur upsert
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { error } = await admin
    .from('newsletter_subscribers')
    .upsert(
      {
        email,
        source: payload.source ?? 'web',
        is_active: true,
        unsubscribed_at: null,
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

  // Email de bienvenue (no-op si RESEND_API_KEY non configuré)
  const tpl = welcomeNewsletterEmail()
  sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch((e) => {
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

  return NextResponse.json({ ok: true }, { status: 200 })
}
