/**
 * Types partagés de la couche IA BRVM (refonte 2026-04-15).
 *
 * La couche IA expose 7 use cases, tous alimentés par un contexte enrichi
 * construit à partir des 4 univers (Marché / Rapports / Annonces / Publications)
 * et du référentiel émetteurs / secteurs / indices.
 */

import type {
  BrvmDocument,
  BrvmEmetteur,
  DocFamily,
  IndexTick,
  MarketSnapshot,
} from '../types'

/** Les 7 use cases IA exposés (cf. brief utilisateur, priorité 1→5 + digests). */
export type BrvmAiUseCase =
  | 'admin_alert' // P1 — alerte admin enrichie
  | 'daily_digest' // P2 — digest journalier
  | 'weekly_digest' // P2 — digest hebdomadaire
  | 'monthly_digest' // P2 — digest mensuel
  | 'article_draft' // P3 — brouillon d'article
  | 'editorial_suggestions' // P4 — idées/angles/titres
  | 'document_scoring' // P5 — qualification bruit/utile/important/prioritaire

export const BRVM_AI_USE_CASE_LABELS: Record<BrvmAiUseCase, string> = {
  admin_alert: 'Alerte admin enrichie',
  daily_digest: 'Digest journalier',
  weekly_digest: 'Digest hebdomadaire',
  monthly_digest: 'Digest mensuel',
  article_draft: "Brouillon d'article",
  editorial_suggestions: 'Suggestions éditoriales',
  document_scoring: 'Scoring document',
}

/** Niveau d'importance qualifié par l'IA (P5). */
export type ImportanceLevel = 'noise' | 'useful' | 'important' | 'priority'

export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  noise: 'Bruit',
  useful: 'Utile',
  important: 'Important',
  priority: 'Prioritaire',
}

/** Document enrichi avec les jointures qu'on fait côté contexte IA. */
export type EnrichedDocument = BrvmDocument & {
  source_name: string
  source_slug: string
  emetteur?: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
}

/** Facettes agrégées sur un jeu de documents (nb par famille, secteur, indice, émetteur). */
export type ContextFacets = {
  by_family: Partial<Record<DocFamily, number>>
  by_subtype: Record<string, number>
  by_sector: Record<string, number>
  by_index: Record<string, number>
  top_emetteurs: Array<{ slug: string; name: string; count: number }>
}

/** Contexte complet passé aux prompts. */
export type BrvmAiContext = {
  period: {
    from: string | null
    to: string | null
    label: string
    days: number
  }
  /** Jeux de docs groupés par famille (tous triés DESC par doc_date puis discovered_at). */
  docs: Partial<Record<DocFamily, EnrichedDocument[]>>
  /** Résumé marché si disponible (dernier snapshot + N derniers). */
  market?: {
    latest_snapshot: MarketSnapshot | null
    latest_indices: IndexTick[]
    snapshots_history_count: number
  }
  /** Facettes agrégées (utilisées par les prompts pour cibler secteurs/indices chauds). */
  facets: ContextFacets
  /** Total de docs dans la période. */
  total_docs: number
  /** Focus optionnel : un émetteur, un secteur ou un indice. */
  focus?: {
    emetteur_slug?: string
    sector?: string
    index?: string
  }
}

/** Options communes à tous les use cases. */
export type BrvmAiOptions = {
  period?: 'today' | '7d' | '30d' | '3m' | 'custom' | 'all'
  period_from?: string
  period_to?: string
  focus_emetteur?: string
  focus_sector?: string
  focus_index?: string
  /** Max docs par famille dans le contexte (évite prompts trop gros). */
  max_docs_per_family?: number
  /** Température IA (défaut par use case). */
  temperature?: number
  /** MaxTokens (défaut par use case). */
  max_tokens?: number
}

export type BrvmAiResponse<T = string> = {
  ok: boolean
  use_case: BrvmAiUseCase
  provider: string | null
  model: string | null
  content: T | null
  error?: string
  skipped?: boolean
  fallback_used?: boolean
  usage?: {
    total_tokens?: number
    duration_ms?: number
  }
  /** Résumé du contexte utilisé (debug + audit). */
  context_summary: {
    total_docs: number
    period_label: string
    families_touched: DocFamily[]
    top_sectors: string[]
  }
}
