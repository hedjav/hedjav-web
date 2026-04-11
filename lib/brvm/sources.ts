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

export type GetSourceResult =
  | { ok: true; source: BrvmSource }
  | { ok: false; reason: 'table_missing' | 'not_seeded' | 'unknown'; error: string }

/**
 * Récupère une source. Distingue 3 cas d'échec pour faciliter le debug :
 *  - table_missing : la migration 020/023 n'a pas été appliquée
 *  - not_seeded   : la table existe mais ne contient pas cette ligne
 *  - unknown      : autre erreur (RLS, réseau, etc.)
 */
export async function getSourceBySlugDetailed(
  slug: SourceSlug | string
): Promise<GetSourceResult> {
  const db = adminClient()
  const { data, error } = await db.from('brvm_sources').select('*').eq('slug', slug).maybeSingle()

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const msg = error.message ?? ''
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      msg.includes('does not exist') ||
      msg.includes('schema cache')
    ) {
      return {
        ok: false,
        reason: 'table_missing',
        error: `Table brvm_sources introuvable. Applique la migration 023_brvm_clean_reset.sql dans Supabase Dashboard → SQL Editor. Erreur réelle : ${msg}`,
      }
    }
    console.error(`[brvm/sources] getSourceBySlugDetailed(${slug}):`, error)
    return { ok: false, reason: 'unknown', error: msg || 'erreur inconnue' }
  }

  if (!data) {
    return {
      ok: false,
      reason: 'not_seeded',
      error: `Source "${slug}" absente de brvm_sources. Le seed n'a pas été appliqué — exécute la migration 023_brvm_clean_reset.sql.`,
    }
  }

  return { ok: true, source: data as BrvmSource }
}

/**
 * Version simple : null si erreur (compat avec le code existant).
 * Préférer getSourceBySlugDetailed dans les nouveaux appels.
 */
export async function getSourceBySlug(slug: SourceSlug | string): Promise<BrvmSource | null> {
  const result = await getSourceBySlugDetailed(slug)
  if (!result.ok) {
    console.error(`[brvm/sources] getSourceBySlug(${slug}): ${result.reason} — ${result.error}`)
    return null
  }
  return result.source
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
