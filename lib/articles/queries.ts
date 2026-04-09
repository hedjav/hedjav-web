import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Article } from '@/lib/supabase/types'

export async function getPublishedArticles(category?: string): Promise<Article[]> {
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()
  let q = supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) {
    console.error('[articles] getPublishedArticles', error)
    return []
  }
  return (data ?? []) as Article[]
}

export async function getFeaturedArticles(limit = 3): Promise<Article[]> {
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('featured', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('[articles] getFeaturedArticles', error)
    return []
  }
  return (data ?? []) as Article[]
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle()

  if (error) {
    console.error('[articles] getArticleBySlug', error)
    return null
  }
  return (data as Article) ?? null
}

export async function getRelatedArticles(
  slug: string,
  category: string,
  limit = 3,
): Promise<Article[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .neq('slug', slug)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as Article[]
}

export async function getAllCategories(): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('articles')
    .select('category')
    .eq('is_published', true)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)

  if (error || !data) return []
  return Array.from(new Set(data.map((r) => r.category as string))).sort()
}

/** ~200 mots par minute, lecture FR */
export function computeReadingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export function formatArticleDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
