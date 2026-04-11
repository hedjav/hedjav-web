import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/smtp'
import { purchaseConfirmationEmail } from '@/lib/email/templates'

/**
 * POST /api/admin/purchases/repair
 *
 * Répare manuellement une purchase bloquée. Utilisé quand :
 *  - Un client a payé mais le webhook FedaPay n'a jamais abouti (status reste pending)
 *  - Une purchase a été créée avec user_id=null mais le client a maintenant un compte
 *  - On veut forcer un re-envoi d'email de confirmation
 *
 * Auth : session admin obligatoire.
 *
 * Body JSON :
 *   {
 *     purchase_id: "uuid",           // la purchase à réparer
 *     action: "mark_paid" | "link_user" | "resend_email",
 *     target_email?: string,         // requis pour link_user si différent de l'actuel
 *   }
 */
export async function POST(request: Request) {
  // Auth admin
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()
  if (!adminUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse body
  let body: { purchase_id?: string; action?: string; target_email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { purchase_id, action, target_email } = body
  if (!purchase_id) {
    return NextResponse.json({ error: 'purchase_id requis' }, { status: 400 })
  }
  if (!action) {
    return NextResponse.json(
      { error: 'action requise (mark_paid | link_user | resend_email)' },
      { status: 400 }
    )
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Récupère la purchase + ebook
  const { data: purchase, error: fetchErr } = await admin
    .from('purchases')
    .select('*, ebook:ebooks(id, title, slug)')
    .eq('id', purchase_id)
    .maybeSingle()

  if (fetchErr || !purchase) {
    return NextResponse.json(
      { error: `Purchase introuvable: ${fetchErr?.message ?? 'not found'}` },
      { status: 404 }
    )
  }

  const ebookJoin = purchase.ebook as
    | { id: string; title: string; slug: string }
    | { id: string; title: string; slug: string }[]
    | null
  const ebook = Array.isArray(ebookJoin) ? ebookJoin[0] : ebookJoin

  // ─── Action 1 : mark_paid ───
  if (action === 'mark_paid') {
    if (purchase.status === 'paid') {
      return NextResponse.json({
        ok: true,
        message: 'Purchase déjà en status paid, aucune action',
        purchase,
      })
    }

    const { error: updateErr } = await admin
      .from('purchases')
      .update({
        status: 'paid',
        raw_payload: {
          ...((purchase.raw_payload as Record<string, unknown> | null) ?? {}),
          manual_repair: {
            by: adminUser.email,
            at: new Date().toISOString(),
            reason: 'Admin a forcé le status à paid via /api/admin/purchases/repair',
          },
        },
      })
      .eq('id', purchase_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `Purchase ${purchase_id} passée à paid. Le client doit rafraîchir /dashboard/mes-ebooks.`,
      previous_status: purchase.status,
    })
  }

  // ─── Action 2 : link_user ───
  if (action === 'link_user') {
    const emailToUse = target_email ?? (purchase.email as string)
    if (!emailToUse) {
      return NextResponse.json({ error: 'email cible introuvable' }, { status: 400 })
    }

    // Cherche un user auth avec cet email
    const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers()
    if (authErr) {
      return NextResponse.json({ error: `listUsers: ${authErr.message}` }, { status: 500 })
    }
    const matchedUser = authUsers.users.find((u) => u.email === emailToUse)
    if (!matchedUser) {
      return NextResponse.json(
        {
          error: `Aucun compte Supabase avec l'email ${emailToUse}`,
          hint: 'Le client doit d\'abord créer un compte avec cet email sur /register',
        },
        { status: 404 }
      )
    }

    const { error: updateErr } = await admin
      .from('purchases')
      .update({ user_id: matchedUser.id, email: emailToUse })
      .eq('id', purchase_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `Purchase liée au compte ${matchedUser.email} (user_id=${matchedUser.id}). Le client verra maintenant cet ebook dans /dashboard/mes-ebooks.`,
      linked_user_id: matchedUser.id,
      linked_email: emailToUse,
    })
  }

  // ─── Action 3 : resend_email ───
  if (action === 'resend_email') {
    if (!ebook) {
      return NextResponse.json(
        { error: 'Ebook introuvable pour cette purchase — impossible de renvoyer l\'email' },
        { status: 400 }
      )
    }

    const tpl = purchaseConfirmationEmail(
      '',
      ebook.title,
      purchase.amount as number,
      ebook.id
    )

    try {
      await sendEmail({
        to: purchase.email as string,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
      return NextResponse.json({
        ok: true,
        message: `Email de confirmation renvoyé à ${purchase.email}`,
      })
    } catch (e) {
      return NextResponse.json(
        { error: `Erreur envoi email: ${e instanceof Error ? e.message : 'unknown'}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: `action inconnue: ${action}. Valides: mark_paid | link_user | resend_email` },
    { status: 400 }
  )
}
