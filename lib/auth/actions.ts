'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
  if (password.length < 8) {
    return { ok: false, error: 'Le mot de passe doit faire au moins 8 caractères.' }
  }

  const supabase = await createSupabaseServerClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/dashboard`,
      data: {
        full_name: fullName,
        country,
        newsletter_opt: newsletterOpt,
      },
    },
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/dashboard')

  if (!email || !password) {
    return { ok: false, error: 'Email et mot de passe requis.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOutAction(): Promise<void> {
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
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) {
    return { ok: false, error: 'Le mot de passe doit faire au moins 8 caractères.' }
  }
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

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      country,
      phone,
      newsletter_opt: newsletterOpt,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/profil')
  return { ok: true }
}
