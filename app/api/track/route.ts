import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/track
 * Body : { type: 'page_view'|'event', session_id, path?, referrer?, event_type?, metadata?, user_agent? }
 * Public — mais vérifie consent statistics avant d'insérer.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.session_id || !body?.type) {
    return NextResponse.json({ ok: true }) // Fail silently
  }

  // Vérifier consent via header (le client l'envoie)
  const consent = request.headers.get('x-hedjav-consent')
  if (consent !== 'statistics') {
    return NextResponse.json({ ok: true }) // Pas de consent → on ne stocke rien
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Récupérer user_id si connecté
  let userId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch { /* pas connecté */ }

  if (body.type === 'page_view') {
    await db.from('page_views').insert({
      session_id: body.session_id,
      user_id: userId,
      path: body.path ?? '/',
      referrer: body.referrer ?? null,
      user_agent: body.user_agent ?? null,
      duration_seconds: body.duration_seconds ?? null,
    })
  } else if (body.type === 'event') {
    await db.from('user_events').insert({
      session_id: body.session_id,
      user_id: userId,
      event_type: body.event_type ?? 'unknown',
      metadata: body.metadata ?? {},
    })
  }

  return NextResponse.json({ ok: true })
}
