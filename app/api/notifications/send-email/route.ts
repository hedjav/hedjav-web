import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/smtp'
import { notificationEmailTemplate } from '@/lib/email/templates'

/**
 * POST /api/notifications/send-email
 * Bearer: INTERNAL_API_TOKEN
 *
 * Envoie par email les admin_notifications non encore envoyées.
 * - <= 3 notifications : emails individuels
 * - > 3 notifications : un seul email digest groupé
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const token = process.env.INTERNAL_API_TOKEN
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1. Récupérer les notifications non envoyées
  const { data: notifications, error: notifErr } = await db
    .from('admin_notifications')
    .select('*')
    .eq('email_sent', false)
    .order('created_at', { ascending: false })

  if (notifErr) {
    return NextResponse.json({ error: notifErr.message }, { status: 500 })
  }

  if (!notifications || notifications.length === 0) {
    return NextResponse.json({ message: 'Aucune notification à envoyer', sent: 0 })
  }

  // 2. Récupérer les emails admin
  const { data: admins } = await db
    .from('profiles')
    .select('email')
    .eq('role', 'admin')

  const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean)

  // Ajouter les emails extra depuis site_config
  const { data: extraConfig } = await db
    .from('site_config')
    .select('value')
    .eq('key', 'notification_extra_emails')
    .single()

  if (extraConfig?.value) {
    const extras = extraConfig.value.split(',').map((e: string) => e.trim()).filter(Boolean)
    adminEmails.push(...extras)
  }

  // Dédupliquer
  const recipients = [...new Set(adminEmails)]

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun destinataire admin trouvé' }, { status: 400 })
  }

  // 3. Envoyer les emails
  let sentCount = 0
  const errors: string[] = []

  if (notifications.length <= 3) {
    // Envoi individuel pour chaque notification
    for (const notif of notifications) {
      const { subject, html, text } = notificationEmailTemplate({
        type: 'single',
        notification: notif,
      })
      const result = await sendEmail({ to: recipients, subject, html, text })
      if (result.ok) {
        sentCount++
      } else {
        errors.push(`Notif ${notif.id}: ${result.error}`)
      }
    }
  } else {
    // Envoi digest groupé
    const { subject, html, text } = notificationEmailTemplate({
      type: 'digest',
      notifications,
    })
    const result = await sendEmail({ to: recipients, subject, html, text })
    if (result.ok) {
      sentCount = notifications.length
    } else {
      errors.push(`Digest: ${result.error}`)
    }
  }

  // 4. Marquer comme envoyées
  const ids = notifications.map((n) => n.id)
  const now = new Date().toISOString()
  await db
    .from('admin_notifications')
    .update({ email_sent: true, email_sent_at: now })
    .in('id', ids)

  return NextResponse.json({
    message: `${sentCount} notification(s) envoyée(s) par email`,
    sent: sentCount,
    total: notifications.length,
    recipients: recipients.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
