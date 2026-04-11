import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/purchases/check?ebook_id=XXX
 *
 * Vérifie si l'utilisateur connecté a déjà acheté un ebook.
 * 401 si non connecté — { purchased: boolean, purchaseId?: string } sinon.
 *
 * Utilise le service-role pour contourner les RLS qui pouvaient masquer des
 * purchases matchées par email. Doit être STRICTEMENT cohérent avec
 * /api/purchases/create qui fait la même vérification (cf. bug observé où
 * check retournait false mais create disait "déjà acheté").
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ebookId = searchParams.get('ebook_id')

  if (!ebookId) {
    return NextResponse.json({ error: 'Missing ebook_id' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Service-role pour bypass les RLS et garder la même logique que /create
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await admin
    .from('purchases')
    .select('id')
    .eq('ebook_id', ebookId)
    .eq('status', 'paid')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[purchases/check] error:', error.message)
    return NextResponse.json({ purchased: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    purchased: !!data,
    purchaseId: data?.id,
  })
}
