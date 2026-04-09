import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/smtp'
import {
  getAllCampaigns,
  getCampaignEmails,
  getSubscribersDueForNextEmail,
  recordSend,
  advanceSubscriberStep,
} from '@/lib/campaigns/queries'

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'

/**
 * POST /api/campaigns/process
 *
 * Parcourt les campagnes actives, envoie les emails dus aux abonnés éligibles.
 * Cap : max 3 emails par semaine par abonné (toutes campagnes confondues).
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaigns = await getAllCampaigns()
  const active = campaigns.filter((c) => c.status === 'active')

  let processed = 0
  let sent = 0
  let skipped = 0

  // Récupère les envois récents pour vérifier le cap hebdo
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: recentSends } = await db
    .from('campaign_sends')
    .select('subscriber_email')
    .gte('sent_at', weekAgo)
    .eq('status', 'sent')

  // Comptage envois par email cette semaine
  const weeklyCount: Record<string, number> = {}
  for (const s of recentSends ?? []) {
    weeklyCount[s.subscriber_email] = (weeklyCount[s.subscriber_email] ?? 0) + 1
  }

  for (const campaign of active) {
    const emails = await getCampaignEmails(campaign.id)
    if (emails.length === 0) continue

    const due = await getSubscribersDueForNextEmail(campaign.id)

    for (const sub of due) {
      processed++

      // Cap 3 emails/semaine
      if ((weeklyCount[sub.email] ?? 0) >= 3) {
        skipped++
        continue
      }

      const nextEmail = emails[sub.campaign_step]
      if (!nextEmail?.body_html) {
        skipped++
        continue
      }

      // Injecte tracking dans le HTML
      const sendId = await recordSend(nextEmail.id, sub.email)
      const trackPixel = `<img src="${SITE}/api/track/open?id=${sendId}" width="1" height="1" style="display:none;" alt="" />`
      const htmlWithTracking = injectTracking(nextEmail.body_html, sendId) + trackPixel

      const result = await sendEmail({
        to: sub.email,
        subject: nextEmail.subject,
        html: htmlWithTracking,
      })

      if (result.ok) {
        sent++
        weeklyCount[sub.email] = (weeklyCount[sub.email] ?? 0) + 1
        await advanceSubscriberStep(sub.email, sub.campaign_step)
      } else {
        skipped++
        await db.from('campaign_sends').update({ status: 'failed' }).eq('id', sendId)
      }
    }
  }

  return NextResponse.json({ ok: true, processed, sent, skipped })
}

/** Remplace les liens <a href="..."> par des liens trackés */
function injectTracking(html: string, sendId: string): string {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => `href="${site}/api/track/click?id=${sendId}&url=${encodeURIComponent(url)}"`,
  )
}
