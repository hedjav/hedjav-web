/**
 * Déduplication des envois emails BRVM.
 *
 * Objectif : éviter qu'un document apparaisse dans 2 digests consécutifs de
 * la même fréquence (daily 2x de suite) ou entre une alerte instantanée et
 * le digest journalier qui suit.
 *
 * Stratégie :
 *   - Chaque envoi enregistre `metadata.document_ids: string[]` dans brvm_alert_log
 *   - Avant de construire un nouveau digest, on lit les logs `success` récents
 *     (24h pour daily, 48h pour alertes) et on exclut ces ids
 *   - weekly/monthly n'excluent pas (synthèse de période : doit tout inclure)
 *
 * Aucune migration : on exploite la colonne `metadata jsonb` déjà présente
 * dans `brvm_alert_log` (migration 025).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DigestFrequency } from './digest'
import type { EnrichedDocument } from '@/lib/brvm/ai/types'

function db(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const DEDUP_WINDOW_HOURS: Partial<Record<DigestFrequency, number>> = {
  daily: 24,
  manual: 12,
  // weekly + monthly : pas de dédup (synthèse de période inclut tout)
}

/**
 * Récupère les document_ids déjà envoyés dans un digest réussi récent.
 * Retourne un Set vide si la fréquence n'a pas de fenêtre de dédup.
 */
export async function getRecentlySentDocIds(
  frequency: DigestFrequency
): Promise<Set<string>> {
  const windowH = DEDUP_WINDOW_HOURS[frequency]
  if (!windowH) return new Set()

  try {
    const since = new Date(Date.now() - windowH * 3600 * 1000).toISOString()
    const { data } = await db()
      .from('brvm_alert_log')
      .select('metadata')
      .in('status', ['success', 'partial'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    const seen = new Set<string>()
    for (const row of data ?? []) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>
      const ids = meta.document_ids
      if (Array.isArray(ids)) {
        for (const id of ids) if (typeof id === 'string') seen.add(id)
      }
    }
    return seen
  } catch {
    return new Set()
  }
}

/**
 * Filtre les documents pour ne garder que ceux non déjà envoyés.
 * Retourne { kept, skipped_count }.
 */
export function filterDedup(
  docs: EnrichedDocument[],
  sentIds: Set<string>
): { kept: EnrichedDocument[]; skipped_count: number } {
  if (sentIds.size === 0) return { kept: docs, skipped_count: 0 }
  const kept = docs.filter((d) => !sentIds.has(d.id))
  return { kept, skipped_count: docs.length - kept.length }
}

/** Hash stable d'un ensemble d'ids (pour identifier un digest unique). */
export function hashDocIds(ids: string[]): string {
  if (ids.length === 0) return 'empty'
  const sorted = [...ids].sort()
  // Simple hash FNV-1a 32 bits (suffisant pour dédup comparison).
  let h = 0x811c9dc5
  for (const id of sorted) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i)
      h = (h * 0x01000193) >>> 0
    }
    h ^= 0x2c
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
