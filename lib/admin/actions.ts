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
  const is_published = formData.get('is_published') === 'on'
  const is_featured = formData.get('is_featured') === 'on'

  const row = {
    title, slug, short_description, description,
    price, original_price, cover_image_url, fedapay_link,
    features, target_audience, is_published, is_featured,
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
  const is_published = formData.get('is_published') === 'on'
  const featured = formData.get('featured') === 'on'
  const published_at = is_published ? new Date().toISOString() : null

  const row = {
    title, slug, excerpt, body, category,
    cover_image_url, author, is_published, featured, published_at,
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
}
