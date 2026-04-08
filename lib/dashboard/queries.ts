import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Profile, Article, Ebook } from '@/lib/supabase/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Met à jour last_visit_at à NOW() et retourne l'ancienne valeur.
 * Utilisé pour calculer les "nouveautés depuis votre dernière visite".
 */
export async function touchLastVisit(userId: string): Promise<string | null> {
  const admin = adminClient()
  const { data: prev } = await admin
    .from('profiles')
    .select('last_visit_at')
    .eq('id', userId)
    .maybeSingle()

  await admin
    .from('profiles')
    .update({ last_visit_at: new Date().toISOString() })
    .eq('id', userId)

  return (prev?.last_visit_at as string | null) ?? null
}

export function profileCompletion(profile: Profile): number {
  const fields = [profile.full_name, profile.country, profile.phone, profile.newsletter_opt]
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== '').length
  return Math.round((filled / fields.length) * 100)
}

export function memberBadge(purchaseCount: number): { label: string; color: string } {
  if (purchaseCount >= 5) return { label: 'Expert', color: 'var(--g700)' }
  if (purchaseCount >= 3) return { label: 'Lecteur', color: 'var(--g500)' }
  return { label: 'Nouveau membre', color: 'var(--n600)' }
}

export async function getNewArticlesSince(since: string | null): Promise<Article[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(5)
  if (since) q = q.gt('published_at', since)
  const { data } = await q
  return (data ?? []) as Article[]
}

export async function getNewEbooksSince(since: string | null): Promise<Ebook[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from('ebooks')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)
  if (since) q = q.gt('created_at', since)
  const { data } = await q
  return (data ?? []) as Ebook[]
}

export async function countTotalEbooks(): Promise<number> {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from('ebooks')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
  return count ?? 0
}
