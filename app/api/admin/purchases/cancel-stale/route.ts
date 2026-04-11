import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/purchases/cancel-stale
 *
 * Marque comme `failed` (status autorisé par le CHECK constraint) toutes les
 * purchases `pending` plus vieilles qu'une certaine durée. Ajoute dans le
 * raw_payload un flag `{cancelled: true, reason: 'stale_pending', auto: true}`
 * pour distinguer les annulations automatiques des vrais échecs FedaPay.
 *
 * Contexte : quand un client initie un paiement FedaPay puis annule (ferme
 * l'onglet, clique "Retour", le timer expire), la purchase reste en 'pending'
 * indéfiniment. Cet endpoint fait le ménage.
 *
 * Auth : session admin OU Bearer INTERNAL_API_TOKEN (pour cron).
 *
 * Query params :
 *   - hours (défaut 2) — âge minimum en heures pour canceller
 *   - dry_run (défaut false) — ne modifie rien, retourne juste la liste
 */
export async function POST(request: Request) {
  // Auth : admin session OU bearer token
  const token = process.env.INTERNAL_API_TOKEN
  const auth = request.headers.get('authorization') ?? ''
  const isBearer = token && auth === `Bearer ${token}`

  if (!isBearer) {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const url = new URL(request.url)
  const hours = Number(url.searchParams.get('hours') ?? '2')
  const dryRun = url.searchParams.get('dry_run') === 'true'

  if (isNaN(hours) || hours < 0.1 || hours > 720) {
    return NextResponse.json(
      { error: 'Paramètre hours invalide (0.1 à 720)' },
      { status: 400 }
    )
  }

  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // 1. Liste les pending à canceller
  const { data: stale, error: fetchErr } = await admin
    .from('purchases')
    .select('id, email, amount, created_at, payment_ref, ebook:ebooks(title)')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const candidates = (stale ?? []) as Array<{
    id: string
    email: string
    amount: number
    created_at: string
    payment_ref: string
    ebook: { title: string } | { title: string }[] | null
  }>

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      cutoff_hours: hours,
      count: candidates.length,
      purchases: candidates.map((p) => ({
        id: p.id,
        email: p.email,
        amount: p.amount,
        created_at: p.created_at,
        payment_ref: p.payment_ref,
        age_hours: (
          (Date.now() - new Date(p.created_at).getTime()) /
          3600000
        ).toFixed(1),
        ebook_title:
          (Array.isArray(p.ebook) ? p.ebook[0] : p.ebook)?.title ?? '(inconnu)',
      })),
    })
  }

  // 2. Update en une passe
  let cancelledCount = 0
  const errors: string[] = []
  for (const p of candidates) {
    const { error: updateErr } = await admin
      .from('purchases')
      .update({
        status: 'failed',
        raw_payload: {
          cancelled: true,
          reason: 'stale_pending',
          auto: true,
          cancelled_at: new Date().toISOString(),
          cutoff_hours: hours,
        },
      })
      .eq('id', p.id)
      .eq('status', 'pending') // safety : ne touche pas si entre-temps passée à paid
    if (updateErr) {
      errors.push(`${p.id}: ${updateErr.message}`)
    } else {
      cancelledCount++
    }
  }

  return NextResponse.json({
    ok: true,
    cutoff_hours: hours,
    cutoff_iso: cutoff,
    total_stale_found: candidates.length,
    cancelled: cancelledCount,
    errors,
  })
}
