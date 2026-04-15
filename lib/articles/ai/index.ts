/**
 * Façade IA articles — point d'entrée unique.
 *
 * Trois tâches génératives (angles / titres / draft) + une évaluation (score).
 * Chaque fonction :
 *   - charge le prompt expert optionnel (site_config.articles_expert_prompt)
 *   - construit le contexte via `buildArticleContext()`
 *   - compose prompt + system via `prompts/*.ts` (3 couches : base + task + expert)
 *   - appelle `generateText` via la couche IA unifiée (`lib/ai/client.ts`)
 *   - retourne une réponse normalisée `ArticleAiResponse<T>` avec traçabilité
 *
 * Aucune chaîne de prompt n'est écrite ici — tout vit dans `prompts/`.
 */

import { generateText, getAiStatus } from '@/lib/ai/client'
import { buildArticleContext, type ArticleContextInput, type ArticleContext } from './context'
import { loadArticlesExpertPrompt } from './expert-prompt'
import { ANGLES_PROMPT_VERSION, buildAnglesPrompt, parseAnglesResponse } from './prompts/angles'
import { TITLES_PROMPT_VERSION, buildTitlesPrompt, parseTitlesResponse } from './prompts/titles'
import { DRAFT_PROMPT_VERSION, buildDraftPrompt, parseDraftResponse } from './prompts/draft'
import {
  SCORING_PROMPT_VERSION,
  buildScoringPrompt,
  parseScoringResponse,
  type ArticleScoringResult,
} from './prompts/scoring'
import type {
  ArticleAngle,
  ArticleDraftContent,
  ArticleTitleIdea,
  ArticleTraceability,
} from '../types'

export type ArticleAiTask = 'angles' | 'titles' | 'draft' | 'scoring'

export type ArticleAiResponse<T> = {
  ok: boolean
  task: ArticleAiTask
  content: T | null
  provider: string | null
  model: string | null
  prompt_version: string
  /** true = le prompt expert (site_config.articles_expert_prompt) était rempli et a été injecté. */
  expert_prompt_used: boolean
  error?: string
  skipped?: boolean
  usage?: { total_tokens?: number; duration_ms?: number }
}

const DEFAULTS: Record<ArticleAiTask, { temperature: number; max_tokens: number; action: string; version: string }> = {
  angles: { temperature: 0.7, max_tokens: 900, action: 'article_angles', version: ANGLES_PROMPT_VERSION },
  titles: { temperature: 0.75, max_tokens: 700, action: 'article_titles', version: TITLES_PROMPT_VERSION },
  draft: { temperature: 0.6, max_tokens: 2800, action: 'article_draft', version: DRAFT_PROMPT_VERSION },
  scoring: { temperature: 0.25, max_tokens: 400, action: 'article_scoring', version: SCORING_PROMPT_VERSION },
}

export async function generateArticleAngles(
  input: ArticleContextInput,
): Promise<ArticleAiResponse<ArticleAngle[]>> {
  const [ctx, expertPrompt] = await Promise.all([
    buildArticleContext(input),
    loadArticlesExpertPrompt(),
  ])
  return runTask<ArticleAngle[]>(
    'angles',
    ctx,
    expertPrompt,
    (c, expert) => buildAnglesPrompt(c, expert),
    parseAnglesResponse,
  )
}

export async function generateArticleTitles(
  input: ArticleContextInput & { angle?: string },
): Promise<ArticleAiResponse<ArticleTitleIdea[]>> {
  const [ctx, expertPrompt] = await Promise.all([
    buildArticleContext(input),
    loadArticlesExpertPrompt(),
  ])
  return runTask<ArticleTitleIdea[]>(
    'titles',
    ctx,
    expertPrompt,
    (c, expert) => buildTitlesPrompt(c, input.angle, expert),
    parseTitlesResponse,
  )
}

export async function generateArticleDraft(
  input: ArticleContextInput & { angle?: string; title?: string },
): Promise<ArticleAiResponse<ArticleDraftContent>> {
  const [ctx, expertPrompt] = await Promise.all([
    buildArticleContext(input),
    loadArticlesExpertPrompt(),
  ])
  return runTask<ArticleDraftContent>(
    'draft',
    ctx,
    expertPrompt,
    (c, expert) => buildDraftPrompt(c, { angle: input.angle, title: input.title }, expert),
    parseDraftResponse,
  )
}

export async function scoreArticleWithAi(article: {
  title: string
  category: string | null
  body: string
}): Promise<ArticleAiResponse<ArticleScoringResult>> {
  const defaults = DEFAULTS.scoring
  const status = getAiStatus()
  const expertPrompt = await loadArticlesExpertPrompt()
  const { system, prompt } = buildScoringPrompt(article, expertPrompt)

  const baseResponse = {
    task: 'scoring' as const,
    prompt_version: defaults.version,
    expert_prompt_used: Boolean(expertPrompt),
  }

  const res = await generateText({
    prompt,
    system,
    action: defaults.action,
    temperature: defaults.temperature,
    maxTokens: defaults.max_tokens,
  })

  if (!res.ok) {
    return {
      ...baseResponse,
      ok: false,
      content: null,
      provider: res.provider ?? null,
      model: res.model ?? null,
      error: res.error,
      skipped: Boolean(res.skipped) || !status.available,
    }
  }

  const parsed = parseScoringResponse(res.text)
  if (!parsed) {
    return {
      ...baseResponse,
      ok: false,
      content: null,
      provider: res.provider,
      model: res.model,
      error: "Parsing JSON scoring échoué",
    }
  }

  return {
    ...baseResponse,
    ok: true,
    content: parsed,
    provider: res.provider,
    model: res.model,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
  }
}

/* ─── Runner générique ──────────────────────────────────────────────── */

type Parser<T> = (raw: string) => T | null | T[]

async function runTask<T>(
  task: ArticleAiTask,
  ctx: ArticleContext,
  expertPrompt: string | null,
  builder: (ctx: ArticleContext, expert: string | null) => { system: string; prompt: string },
  parser: Parser<T>,
): Promise<ArticleAiResponse<T>> {
  const defaults = DEFAULTS[task]
  const status = getAiStatus()

  const baseResponse = {
    task,
    prompt_version: defaults.version,
    expert_prompt_used: Boolean(expertPrompt),
  }

  if (!status.available) {
    return {
      ...baseResponse,
      ok: false,
      content: null,
      provider: null,
      model: null,
      skipped: true,
      error: 'Aucun provider IA configuré',
    }
  }

  const { system, prompt } = builder(ctx, expertPrompt)
  const res = await generateText({
    prompt,
    system,
    action: defaults.action,
    temperature: defaults.temperature,
    maxTokens: defaults.max_tokens,
  })

  if (!res.ok) {
    return {
      ...baseResponse,
      ok: false,
      content: null,
      provider: res.provider ?? null,
      model: res.model ?? null,
      error: res.error,
      skipped: Boolean(res.skipped),
    }
  }

  const parsed = parser(res.text)
  if (parsed == null || (Array.isArray(parsed) && parsed.length === 0)) {
    return {
      ...baseResponse,
      ok: false,
      content: null,
      provider: res.provider,
      model: res.model,
      error: 'Parsing réponse IA échoué',
    }
  }

  return {
    ...baseResponse,
    ok: true,
    content: parsed as T,
    provider: res.provider,
    model: res.model,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
  }
}

/**
 * Fabrique un objet de traçabilité prêt à être stocké dans articles.metadata.
 * La route finale est libre d'ajouter des champs (source_documents, instructions…).
 */
export function buildTraceability(args: {
  source_type: ArticleTraceability['source_type']
  response: ArticleAiResponse<unknown>
  source_documents?: string[]
  subject?: string
  angle?: string
  instructions?: string
  quality_score?: number
}): ArticleTraceability {
  return {
    source_type: args.source_type,
    source_documents: args.source_documents?.length ? args.source_documents : undefined,
    provider: args.response.provider ?? null,
    model: args.response.model ?? null,
    prompt_version: args.response.prompt_version,
    expert_prompt_used: args.response.expert_prompt_used,
    generated_at: new Date().toISOString(),
    subject: args.subject,
    angle: args.angle,
    instructions: args.instructions,
    quality_score: args.quality_score,
  }
}

export type { ArticleScoringResult }
