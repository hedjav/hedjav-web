import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { touchLastVisit } from '@/lib/dashboard/queries'

/**
 * POST /api/auth/activity-touch
 *
 * Rafraîchit `profiles.last_visit_at` pour l'utilisateur courant.
 * Appelé périodiquement par `components/features/InactivityMonitor.tsx`
 * lors d'actions utilisateur (click, scroll, input, route change).
 *
 * Ne fait rien si l'utilisateur n'est pas connecté (retourne 204).
 */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse(null, { status: 204 })
  }
  await touchLastVisit(user.id)
  return NextResponse.json({ ok: true, at: new Date().toISOString() })
}
