import { createClient } from '@supabase/supabase-js'
import type { Campaign, CampaignEmail, CampaignSend } from '@/lib/supabase/types'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/* ── Campaigns ─────────────────────────────────────────── */

export async function getAllCampaigns(): Promise<Campaign[]> {
  const { data } = await admin()
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Campaign[]
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data } = await admin().from('campaigns').select('*').eq('id', id).maybeSingle()
  return data as Campaign | null
}

/* ── Campaign Emails ───────────────────────────────────── */

export async function getCampaignEmails(campaignId: string): Promise<CampaignEmail[]> {
  const { data } = await admin()
    .from('campaign_emails')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('position', { ascending: true })
  return (data ?? []) as CampaignEmail[]
}

/* ── Campaign Sends ────────────────────────────────────── */

export async function getCampaignSends(campaignEmailId: string): Promise<CampaignSend[]> {
  const { data } = await admin()
    .from('campaign_sends')
    .select('*')
    .eq('campaign_email_id', campaignEmailId)
    .order('created_at', { ascending: false })
  return (data ?? []) as CampaignSend[]
}

export async function recordSend(campaignEmailId: string, email: string): Promise<string> {
  const { data } = await admin()
    .from('campaign_sends')
    .insert({ campaign_email_id: campaignEmailId, subscriber_email: email, status: 'sent', sent_at: new Date().toISOString() })
    .select('id')
    .single()
  return data!.id as string
}

export async function updateSendStatus(
  sendId: string,
  status: 'opened' | 'clicked',
  timestamp: string,
) {
  const field = status === 'opened' ? 'opened_at' : 'clicked_at'
  await admin()
    .from('campaign_sends')
    .update({ status, [field]: timestamp })
    .eq('id', sendId)
}

/* ── Targeting ─────────────────────────────────────────── */

export async function getSubscribersForCampaign(campaign: Campaign) {
  const db = admin()
  let query = db
    .from('newsletter_subscribers')
    .select('email, first_name, tags, enrolled_campaign_id, campaign_step, last_email_sent_at')
    .eq('is_active', true)

  const tags = campaign.target_tags ?? []
  if (tags.length > 0) {
    // Filtre abonnés qui ont au moins un tag en commun
    query = query.overlaps('tags', tags)
  }

  const { data } = await query
  return data ?? []
}

export async function getSubscribersDueForNextEmail(campaignId: string) {
  const emails = await getCampaignEmails(campaignId)
  if (emails.length === 0) return []

  const { data: subs } = await admin()
    .from('newsletter_subscribers')
    .select('email, first_name, campaign_step, last_email_sent_at')
    .eq('is_active', true)
    .eq('enrolled_campaign_id', campaignId)
    .lt('campaign_step', emails.length)

  const now = Date.now()
  return (subs ?? []).filter((sub) => {
    const nextEmail = emails[sub.campaign_step]
    if (!nextEmail) return false
    if (sub.campaign_step === 0 && !sub.last_email_sent_at) return true
    if (!sub.last_email_sent_at) return true
    const elapsed = now - new Date(sub.last_email_sent_at).getTime()
    return elapsed >= nextEmail.delay_days * 24 * 3600 * 1000
  })
}

/* ── Stats ─────────────────────────────────────────────── */

export async function getCampaignStats(campaignId: string) {
  const emails = await getCampaignEmails(campaignId)
  const emailIds = emails.map((e) => e.id)
  if (emailIds.length === 0) return { emails: 0, sent: 0, opened: 0, clicked: 0 }

  const { data: sends } = await admin()
    .from('campaign_sends')
    .select('status')
    .in('campaign_email_id', emailIds)

  const all = sends ?? []
  return {
    emails: emails.length,
    sent: all.length,
    opened: all.filter((s) => s.status === 'opened' || s.status === 'clicked').length,
    clicked: all.filter((s) => s.status === 'clicked').length,
  }
}

export async function getSubscriberScore(email: string): Promise<{ score: number; level: 'froid' | 'tiede' | 'chaud' }> {
  const { data } = await admin()
    .from('campaign_sends')
    .select('status')
    .eq('subscriber_email', email)

  let score = 0
  for (const s of data ?? []) {
    if (s.status === 'opened') score += 1
    if (s.status === 'clicked') score += 2
  }

  const level = score > 5 ? 'chaud' : score >= 3 ? 'tiede' : 'froid'
  return { score, level }
}

/* ── Helpers d'écriture ────────────────────────────────── */

export async function advanceSubscriberStep(email: string, currentStep: number) {
  await admin()
    .from('newsletter_subscribers')
    .update({
      campaign_step: currentStep + 1,
      last_email_sent_at: new Date().toISOString(),
    })
    .eq('email', email)
}
