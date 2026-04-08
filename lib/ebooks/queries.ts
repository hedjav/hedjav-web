import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Ebook } from '@/lib/supabase/types'

export async function getPublishedEbooks(): Promise<Ebook[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('ebooks')
    .select('*')
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ebooks] getPublishedEbooks', error)
    return []
  }
  return (data ?? []) as Ebook[]
}

export async function getFeaturedEbooks(limit = 3): Promise<Ebook[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('ebooks')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[ebooks] getFeaturedEbooks', error)
    return []
  }
  return (data ?? []) as Ebook[]
}

export async function getEbookBySlug(slug: string): Promise<Ebook | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('ebooks')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    console.error('[ebooks] getEbookBySlug', error)
    return null
  }
  return (data as Ebook) ?? null
}

export function formatPriceFcfa(price: number): string {
  return `${price.toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`
}

export function discountPercent(price: number, original: number): number {
  if (!original || original <= price) return 0
  return Math.round(((original - price) / original) * 100)
}
