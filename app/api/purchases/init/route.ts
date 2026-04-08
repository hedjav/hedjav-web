import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/purchases/init
 * Body : { ebook_id, email, payment_ref }
 *
 * Crée une purchase en status='pending' juste avant la redirection FedaPay.
 * Le webhook FedaPay la passera en 'paid' après confirmation.
 */
export async function POST(request: Request) {
  let payload: { ebook_id?: string; email?: string; payment_ref?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { ebook_id, email, payment_ref } = payload
  if (!ebook_id || !email || !payment_ref) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // user_id si connecté (sinon achat anonyme)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Récupérer le prix actuel de l'ebook côté serveur (pas de confiance au client)
  const { data: ebook, error: ebookErr } = await supabase
    .from('ebooks')
    .select('id, price')
    .eq('id', ebook_id)
    .single()
  if (ebookErr || !ebook) {
    return NextResponse.json({ error: 'Ebook not found' }, { status: 404 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await admin
    .from('purchases')
    .upsert(
      {
        user_id: user?.id ?? null,
        email: email.trim().toLowerCase(),
        ebook_id,
        amount: ebook.price,
        payment_ref,
        status: 'pending',
      },
      { onConflict: 'payment_ref' },
    )
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
