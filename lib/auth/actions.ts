'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/smtp'
import { welcomeEmail } from '@/lib/email/templates'
import { createNotification } from '@/lib/notifications/queries'
import { siteUrl } from '@/lib/url'
import { validatePassword } from '@/lib/utils/validation'

type ActionResult = { ok: true } | { ok: false; error: string }

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const country = String(formData.get('country') ?? 'BJ')
  const newsletterOpt = formData.get('newsletter_opt') === 'on'

  if (!email || !password || !fullName) {
    return { ok: false, error: 'Tous les champs marqués sont obligatoires.' }
  }
  const pwCheck = validatePassword(password)
  if (!pwCheck.isValid) return { ok: false, error: pwCheck.errors.join('. ') }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl('/dashboard'),
      data: {
        full_name: fullName,
        country,
        newsletter_opt: newsletterOpt,
      },
    },
  })

  if (error) return { ok: false, error: error.message }

  // Email de bienvenue (no-op si SMTP_HOST non configuré)
  const tpl = welcomeEmail(fullName)
  sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch((e) => {
    console.error('[auth] welcome email failed', e)
  })

  // Notification admin
  createNotification('member', 'Nouveau membre', `${fullName} (${email})`).catch((e) => {
    console.error('[auth] notification failed', e)
  })

  return { ok: true }
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const rawNext = String(formData.get('next') ?? '/dashboard')
  // Sécurité : empêcher les redirections vers des URLs externes
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (!email || !password) {
    return { ok: false, error: 'Email et mot de passe requis.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: 'Identifiants incorrects.' }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOutAction(_formData?: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) return { ok: false, error: 'Email requis.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl('/reset-password'),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '')
  const pwCheck = validatePassword(password)
  if (!pwCheck.isValid) return { ok: false, error: pwCheck.errors.join('. ') }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const country = String(formData.get('country') ?? 'BJ')
  const phone = String(formData.get('phone') ?? '').trim() || null
  const newsletterOpt = formData.get('newsletter_opt') === 'on'

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié.' }

  // Upsert pour gérer le cas où le trigger handle_new_user n'a pas créé le profil
  // (utilisateur créé avant que la migration 003 ne soit appliquée).
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email!,
        full_name: fullName,
        country,
        phone,
        newsletter_opt: newsletterOpt,
      },
      { onConflict: 'id' },
    )

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/profil')
  return { ok: true }
}
