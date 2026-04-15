'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/session'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// =====================================================
// EBOOKS
// =====================================================
export async function upsertEbookAction(formData: FormData) {
  await requireAdmin()
  const supabase = adminClient()

  const id = formData.get('id') ? String(formData.get('id')) : null
  const title = String(formData.get('title') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim() || slugify(title)
  const short_description = String(formData.get('short_description') ?? '').trim()
  const description = String(formData.get('description') ?? '')
  const price = Number(formData.get('price') ?? 0)
  const original_price = Number(formData.get('original_price') ?? 0)
  const cover_image_url = String(formData.get('cover_image_url') ?? '') || null
  const fedapay_link = String(formData.get('fedapay_link') ?? '').trim()
  const features = String(formData.get('features') ?? '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
  const target_audience = String(formData.get('target_audience') ?? '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
  const lead_magnet_url = String(formData.get('lead_magnet_url') ?? '') || null
  const lead_magnet_description = String(formData.get('lead_magnet_description') ?? '') || null
  const is_published = formData.get('is_published') === 'on'
  const is_featured = formData.get('is_featured') === 'on'

  const row = {
    title, slug, short_description, description,
    price, original_price, cover_image_url, fedapay_link,
    features, target_audience, lead_magnet_url, lead_magnet_description,
    is_published, is_featured,
  }

  const { error } = id
    ? await supabase.from('ebooks').update(row).eq('id', id)
    : await supabase.from('ebooks').insert(row)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/ebooks')
  revalidatePath('/ebooks')
  redirect('/admin/ebooks')
}

export async function deleteEbookAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const supabase = adminClient()
  const { error } = await supabase.from('ebooks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/ebooks')
  revalidatePath('/ebooks')
  redirect('/admin/ebooks')
}

// =====================================================
// ARTICLES
// =====================================================
export async function upsertArticleAction(formData: FormData) {
  await requireAdmin()
  const supabase = adminClient()

  const id = formData.get('id') ? String(formData.get('id')) : null
  const title = String(formData.get('title') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim() || slugify(title)
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const body = String(formData.get('body') ?? '')
  const category = String(formData.get('category') ?? '').trim()
  const cover_image_url = String(formData.get('cover_image_url') ?? '') || null
  const author = String(formData.get('author') ?? 'Hermann D. AVAHOUIN')
  const statusRaw = String(formData.get('status') ?? 'draft')
  const status = (['draft', 'review', 'published', 'archived'] as const).includes(
    statusRaw as 'draft' | 'review' | 'published' | 'archived',
  )
    ? (statusRaw as 'draft' | 'review' | 'published' | 'archived')
    : 'draft'
  const featured = formData.get('featured') === 'on'

  // Pour la création (pas d'id), on laisse le trigger articles_sync_is_published_trg
  // gérer is_published + published_at. On ne les envoie pas explicitement.
  const row = {
    title, slug, excerpt, body, category,
    cover_image_url, author, featured, status,
    source: 'manual',
    created_by: 'admin-ui',
  }

  const { error } = id
    ? await supabase.from('articles').update(row).eq('id', id)
    : await supabase.from('articles').insert(row)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/articles')
  revalidatePath('/blog')
  redirect('/admin/articles')
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const supabase = adminClient()
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/articles')
  revalidatePath('/blog')
  redirect('/admin/articles')
}
