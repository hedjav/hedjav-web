import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/signout
 * Endpoint plus fiable que le Server Action `signOutAction` côté Client Component.
 * Le client appelle cet endpoint puis fait window.location.href = '/' pour
 * forcer un full reload (Header Server Component re-rend en logged-out).
 */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
