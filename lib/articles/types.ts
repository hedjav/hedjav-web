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
 */
export type ArticleAiSource = 'ai_subject' | 'ai_brvm' | 'manual'

/** Payload de traçabilité persisté dans articles.metadata. */
export type ArticleTraceability = {
  source_type: ArticleAiSource
  source_documents?: string[]
  provider?: string | null
  model?: string | null
  prompt_version?: string
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
