'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Result = { ok: true; id?: string } | { ok: false; error: string }

export async function createCampaign(formData: FormData): Promise<Result> {
  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? 'welcome_sequence')
  const tagsRaw = String(formData.get('target_tags') ?? '').trim()
  const target_tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

  if (!name) return { ok: false, error: 'Nom requis' }

  // Check uniqueness
  const { data: existing } = await admin()
    .from('campaigns')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) return { ok: false, error: 'Une campagne avec ce nom existe deja' }

  const { data, error } = await admin()
    .from('campaigns')
    .insert({ name, type, target_tags, status: 'draft' })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/campagnes')
  return { ok: true, id: data.id }
}

export async function updateCampaignStatus(
  id: string,
  status: 'draft' | 'active' | 'paused' | 'completed',
): Promise<Result> {
  const { error } = await admin().from('campaigns').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/campagnes')
  revalidatePath(`/admin/campagnes/${id}`)
  return { ok: true }
}

export async function addCampaignEmail(formData: FormData): Promise<Result> {
  const campaign_id = String(formData.get('campaign_id') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const position = Number(formData.get('position') ?? 1)
  const delay_days = Number(formData.get('delay_days') ?? 0)
  const body_prompt = String(formData.get('body_prompt') ?? '').trim() || null

  if (!campaign_id || !subject) return { ok: false, error: 'campaign_id et subject requis' }

  const { data, error } = await admin()
    .from('campaign_emails')
    .insert({ campaign_id, subject, position, delay_days, body_prompt })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/campagnes/${campaign_id}`)
  return { ok: true, id: data.id }
}

export async function updateCampaignEmail(
  id: string,
  data: { subject?: string; body_html?: string; delay_days?: number; body_prompt?: string },
): Promise<Result> {
  const { error } = await admin().from('campaign_emails').update(data).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteCampaignEmail(id: string, campaignId: string): Promise<Result> {
  const { error } = await admin().from('campaign_emails').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/campagnes/${campaignId}`)
  return { ok: true }
}

export async function deleteCampaign(id: string): Promise<Result> {
  const db = admin()
  // Delete sends first (FK cascade may not be set)
  const { data: emails } = await db.from('campaign_emails').select('id').eq('campaign_id', id)
  if (emails && emails.length > 0) {
    const emailIds = emails.map((e) => e.id)
    await db.from('campaign_sends').delete().in('campaign_email_id', emailIds)
  }
  // Delete emails
  await db.from('campaign_emails').delete().eq('campaign_id', id)
  // Delete campaign
  const { error } = await db.from('campaigns').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/campagnes')
  return { ok: true }
}

export async function updateCampaign(
  id: string,
  data: { name?: string; type?: string; target_tags?: string[] },
): Promise<Result> {
  const { error } = await admin().from('campaigns').update(data).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/campagnes')
  revalidatePath(`/admin/campagnes/${id}`)
  return { ok: true }
}
