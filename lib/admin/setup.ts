'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/session'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Compte les admins existants. Sert à savoir si /admin-setup est encore actif.
 */
export async function countAdmins(): Promise<number> {
  const supabase = adminClient()
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
  return count ?? 0
}

type SetupResult = { ok: true } | { ok: false; error: string }

/**
 * Promouvoir le user courant en admin via le code de bootstrap.
 * - Refuse si un admin existe déjà
 * - Refuse si pas connecté
 * - Refuse si code incorrect
 */
export async function bootstrapAdminAction(formData: FormData): Promise<SetupResult> {
  const code = String(formData.get('code') ?? '').trim()
  if (!code) return { ok: false, error: 'Code requis.' }

  const expected = process.env.ADMIN_SETUP_CODE
  if (!expected) {
    return { ok: false, error: 'ADMIN_SETUP_CODE non configuré côté serveur.' }
  }
  if (code !== expected) {
    return { ok: false, error: 'Code incorrect.' }
  }

  // Vérifier qu'aucun admin n'existe déjà
  const existing = await countAdmins()
  if (existing > 0) {
    return { ok: false, error: 'Un administrateur existe déjà.' }
  }

  // Récupérer le user courant
  const ssr = await createSupabaseServerClient()
  const { data: { user } } = await ssr.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Vous devez être connecté pour devenir admin.' }
  }

  // Promouvoir via service role (upsert pour gérer l'absence de profile)
  const admin = adminClient()
  const { error } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email!,
        role: 'admin',
      },
      { onConflict: 'id' },
    )
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

/**
 * Promouvoir un user existant en admin (depuis /admin/membres).
 */
export async function promoteUserAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const userId = String(formData.get('user_id') ?? '')
  if (!userId) return
  const supabase = adminClient()
  await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId)
  revalidatePath('/admin/membres')
}

/**
 * Rétrograder un admin en simple member.
 */
export async function demoteUserAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const userId = String(formData.get('user_id') ?? '')
  if (!userId) return

  // Empêcher de rétrograder le dernier admin
  const remaining = await countAdmins()
  if (remaining <= 1) return

  const supabase = adminClient()
  await supabase.from('profiles').update({ role: 'member' }).eq('id', userId)
  revalidatePath('/admin/membres')
}
