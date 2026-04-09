import { createClient } from '@supabase/supabase-js'
import type { PopupConfig } from '@/lib/supabase/types'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function getActivePopupConfig() {
  const { data } = await admin()
    .from('popup_config')
    .select('*, ebook:ebooks(id, title, slug, cover_image_url, lead_magnet_url, lead_magnet_description)')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data as (PopupConfig & { ebook: { id: string; title: string; slug: string; cover_image_url: string | null; lead_magnet_url: string | null; lead_magnet_description: string | null } | null }) | null
}

export async function getPopupConfig() {
  const { data } = await admin()
    .from('popup_config')
    .select('*, ebook:ebooks(id, title, slug, cover_image_url, lead_magnet_url, lead_magnet_description)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as (PopupConfig & { ebook: { id: string; title: string; slug: string; cover_image_url: string | null; lead_magnet_url: string | null; lead_magnet_description: string | null } | null }) | null
}

export async function incrementPopupShown(configId: string) {
  const { data } = await admin().from('popup_config').select('stats_shown').eq('id', configId).single()
  if (data) {
    await admin().from('popup_config').update({ stats_shown: (data.stats_shown ?? 0) + 1 }).eq('id', configId)
  }
}

export async function incrementPopupSubmitted(configId: string) {
  const { data } = await admin().from('popup_config').select('stats_submitted').eq('id', configId).single()
  if (data) {
    await admin().from('popup_config').update({ stats_submitted: (data.stats_submitted ?? 0) + 1 }).eq('id', configId)
  }
}
