import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import * as FedaPaySDK from 'fedapay'
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit'

/**
 * POST /api/purchases/create
 * Body : { ebook_id }
 *
 * Crée une purchase pending + transaction FedaPay server-side.
 * Retourne { payment_url, purchase_id }.
 */
export async function POST(request: Request) {
  // Rate limit : 3 requêtes par minute par IP
  const rl = checkRateLimit(`purchases:${getClientIp(request)}`, 3, 60_000)
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 })

  // --- Auth ---
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // --- Body ---
  let body: { ebook_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { ebook_id } = body
  if (!ebook_id) {
    return NextResponse.json({ error: 'ebook_id requis' }, { status: 400 })
  }

  // --- Admin client ---
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // --- Ebook ---
  const { data: ebook, error: ebookErr } = await admin
    .from('ebooks')
    .select('id, title, price, is_published')
    .eq('id', ebook_id)
    .single()

  if (ebookErr || !ebook) {
    return NextResponse.json({ error: 'Ebook introuvable' }, { status: 404 })
  }

  if (!ebook.is_published) {
    return NextResponse.json({ error: 'Ebook non disponible' }, { status: 400 })
  }

  // --- Profile ---
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  // --- Already purchased? ---
  // On cherche par user_id OU email pour couvrir les achats pré-auth (user_id null)
  // qui auraient été matchés côté webhook via l'email.
  const { data: existing } = await admin
    .from('purchases')
    .select('id, status')
    .eq('ebook_id', ebook_id)
    .eq('status', 'paid')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        error: 'Ebook déjà acheté',
        message:
          "Vous avez déjà acheté cet ebook avec succès. Accédez-y depuis votre bibliothèque.",
        action: {
          label: 'Voir mes ebooks',
          href: '/dashboard/mes-ebooks',
        },
        purchase_id: existing.id,
      },
      { status: 409 }
    )
  }

  // --- Create purchase pending ---
  const { data: purchase, error: purchaseErr } = await admin
    .from('purchases')
    .insert({
      user_id: user.id,
      email: user.email!,
      ebook_id,
      amount: ebook.price,
      status: 'pending',
      payment_ref: '', // will be updated after FedaPay
    })
    .select('id')
    .single()

  if (purchaseErr || !purchase) {
    console.error('[purchases/create] insert failed', purchaseErr)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }

  // --- FedaPay Transaction ---
  try {
    FedaPaySDK.FedaPay.setApiKey(process.env.FEDAPAY_API_KEY!)
    FedaPaySDK.FedaPay.setEnvironment('live')

    const transaction = await FedaPaySDK.Transaction.create({
      description: `Achat ebook : ${ebook.title}`,
      amount: ebook.price,
      currency: { iso: 'XOF' },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/merci?purchase_id=${purchase.id}`,
      customer: {
        email: user.email,
        firstname: profile?.full_name?.split(' ')[0] || '',
        lastname: profile?.full_name?.split(' ').slice(1).join(' ') || '',
      },
    })

    // Update purchase with payment_ref
    await admin
      .from('purchases')
      .update({ payment_ref: String(transaction.id) })
      .eq('id', purchase.id)

    const token = await transaction.generateToken()

    return NextResponse.json({
      payment_url: (token as unknown as { url: string }).url,
      purchase_id: purchase.id,
    })
  } catch (e) {
    console.error('[purchases/create] FedaPay error', e)

    // Clean up pending purchase
    await admin.from('purchases').delete().eq('id', purchase.id)

    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement FedaPay' },
      { status: 500 },
    )
  }
}
