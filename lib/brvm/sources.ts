import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BrvmSource, SourceSlug } from './types'

/**
 * Client Supabase service-role dédié aux opérations BRVM.
 * Utilisé uniquement côté serveur (routes API, scripts).
 */
function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getAllSources(): Promise<BrvmSource[]> {
  const db = adminClient()
  const { data, error } = await db
    .from('brvm_sources')
    .select('*')
    .order('priority', { ascending: true })

  if (error) {
    console.error('[brvm/sources] getAllSources:', error.message)
    return []
  }
  return (data as BrvmSource[]) ?? []
}

export async function getSourceBySlug(slug: SourceSlug | string): Promise<BrvmSource | null> {
  const db = adminClient()
  const { data, error } = await db.from('brvm_sources').select('*').eq('slug', slug).maybeSingle()

  if (error) {
    console.error(`[brvm/sources] getSourceBySlug(${slug}):`, error.message)
    return null
  }
  return (data as BrvmSource) ?? null
}

/**
 * Marque une source comme scrapée. À appeler à chaque run, même en cas d'erreur,
 * pour tracer la dernière tentative (pas forcément le dernier succès).
 */
export async function markSourceScraped(
  sourceId: string,
  opts: { success: boolean; error?: string | null }
): Promise<void> {
  const db = adminClient()
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    last_scraped_at: now,
    last_error: opts.success ? null : opts.error ?? 'unknown',
  }
  if (opts.success) patch.last_success_at = now

  const { error } = await db.from('brvm_sources').update(patch).eq('id', sourceId)
  if (error) console.error('[brvm/sources] markSourceScraped:', error.message)
}
