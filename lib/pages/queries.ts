import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Page = {
  id: string
  slug: string
  title: string
  body: string
  cover_image_url: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return data as Page
}
