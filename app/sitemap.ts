import type { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hedjav.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServerClient()

  const [{ data: ebooks }, { data: articles }] = await Promise.all([
    supabase.from('ebooks').select('slug, updated_at').eq('is_published', true),
    supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString()),
  ])

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/ebooks`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/a-propos`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/register`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const ebookUrls: MetadataRoute.Sitemap = (ebooks ?? []).map((e) => ({
    url: `${BASE}/ebooks/${e.slug}`,
    lastModified: e.updated_at as string,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const articleUrls: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE}/blog/${a.slug}`,
    lastModified: a.updated_at as string,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticUrls, ...ebookUrls, ...articleUrls]
}
