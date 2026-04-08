import { NextResponse } from 'next/server'
import { subscribeNewsletter } from '@/lib/brevo/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/newsletter/subscribe
 * Body : { email, source?: 'home' | 'article' | 'footer' | 'register' }
 * Public endpoint, pas d'auth.
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

  // Si l'utilisateur est connecté → mettre à jour son profile.newsletter_opt
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ newsletter_opt: true })
        .eq('id', user.id)
    }
  } catch (e) {
    console.error('[newsletter] profile update failed', e)
  }

  // Brevo (avec double opt-in si DOI_TEMPLATE_ID configuré)
  const result = await subscribeNewsletter(email, {
    SOURCE: payload.source ?? 'web',
  })

  if (!result.ok && !('skipped' in result && result.skipped)) {
    console.error('[newsletter]', result.error)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
