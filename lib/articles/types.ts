import type { ArticleCategory } from './categories'

/** Workflow éditorial (migration 030). Source de vérité. */
export type ArticleStatus = 'draft' | 'review' | 'published' | 'archived'

export const ARTICLE_STATUSES: ArticleStatus[] = ['draft', 'review', 'published', 'archived']

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  review: 'À relire',
  published: 'Publié',
  archived: 'Archivé',
}

/** Origine du contenu. `source` en base garde la granularité historique. */
export type ArticleSource = 'manual' | 'ai'

/**
 * Type de source utilisé par la couche IA. Persistance dans
 * articles.metadata.source_type.
 *
 * - `manual`           : saisie directe admin
 * - `ai_subject`       : sujet libre uniquement
 * - `ai_brvm_single`   : 1 document BRVM de référence
 * - `ai_brvm_batch`    : lot de documents BRVM (période, société, catégorie, sélection)
 * - `ai_hybrid`        : sujet libre + documents BRVM combinés
 */
export type ArticleAiSource =
  | 'manual'
  | 'ai_subject'
  | 'ai_brvm_single'
  | 'ai_brvm_batch'
  | 'ai_hybrid'

/** Payload de traçabilité persisté dans articles.metadata. */
export type ArticleTraceability = {
  source_type: ArticleAiSource
  source_documents?: string[]
  /** Nombre de documents BRVM de référence (utile pour distinguer single vs batch sans parser source_type). */
  source_documents_count?: number
  provider?: string | null
  model?: string | null
  prompt_version?: string
  /** true si le prompt expert (site_config.articles_expert_prompt) était rempli au moment de la génération. */
  expert_prompt_used?: boolean
  generated_at?: string
  subject?: string
  angle?: string
  instructions?: string
  quality_score?: number
}

export type ArticleDraftContent = {
  title: string
  excerpt: string
  category: ArticleCategory
  body: string
}

export type ArticleAngle = {
  id: string
  angle: string
  audience: string
  why_now: string
}

export type ArticleTitleIdea = {
  title: string
  hook: string
  seo_keywords: string[]
}
