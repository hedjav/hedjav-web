import type { ImportanceLevel } from '@/lib/brvm/ai/types'

type ExtractedScore = {
  importance: ImportanceLevel
  score_100: number
  rationale?: string
} | null

/**
 * Extrait le scoring IA depuis `brvm_documents.metadata.ai_score` (persisté par
 * /api/brvm/ai/score après chaque évaluation). Retourne null si absent ou mal
 * formé.
 */
export function extractAiScore(metadata: Record<string, unknown> | null | undefined): ExtractedScore {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as { ai_score?: unknown }).ai_score
  if (!raw || typeof raw !== 'object') return null
  const r = raw as {
    importance?: unknown
    score_100?: unknown
    rationale?: unknown
  }
  const imp = r.importance
  if (
    typeof imp !== 'string' ||
    !['noise', 'useful', 'important', 'priority'].includes(imp)
  ) {
    return null
  }
  const score = typeof r.score_100 === 'number' ? r.score_100 : 0
  return {
    importance: imp as ImportanceLevel,
    score_100: Math.max(0, Math.min(100, Math.round(score))),
    rationale: typeof r.rationale === 'string' ? r.rationale : undefined,
  }
}
