/**
 * Façade IA articles — point d'entrée unique.
 *
 * Trois tâches génératives (angles / titres / draft) + une évaluation (score).
 * Chaque fonction :
 *   - construit le contexte via `buildArticleContext()`
 *   - compose prompt + system via `prompts/*.ts`
 *   - appelle `generateText` via la couche IA unifiée (`lib/ai/client.ts`)
 *   - retourne une réponse normalisée `ArticleAiResponse<T>` avec traçabilité
 *
 * Aucune chaîne de prompt n'est écrite ici — tout vit dans `prompts/`.
 */

import { generateText, getAiStatus } from '@/lib/ai/client'
import { buildArticleContext, type ArticleContextInput, type ArticleContext } from './context'
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
  input: ArticleContextInput
): Promise<ArticleAiResponse<ArticleAngle[]>> {
  const ctx = await buildArticleContext(input)
  return runTask<ArticleAngle[]>('angles', ctx, buildAnglesPrompt, parseAnglesResponse)
}

export async function generateArticleTitles(
  input: ArticleContextInput & { angle?: string }
): Promise<ArticleAiResponse<ArticleTitleIdea[]>> {
  const ctx = await buildArticleContext(input)
  return runTask<ArticleTitleIdea[]>(
    'titles',
    ctx,
    (c) => buildTitlesPrompt(c, input.angle),
    parseTitlesResponse,
  )
}

export async function generateArticleDraft(
  input: ArticleContextInput & { angle?: string; title?: string }
): Promise<ArticleAiResponse<ArticleDraftContent>> {
  const ctx = await buildArticleContext(input)
  return runTask<ArticleDraftContent>(
    'draft',
    ctx,
    (c) => buildDraftPrompt(c, { angle: input.angle, title: input.title }),
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
  const { system, prompt } = buildScoringPrompt(article)

  const res = await generateText({
    prompt,
    system,
    action: defaults.action,
    temperature: defaults.temperature,
    maxTokens: defaults.max_tokens,
  })

  if (!res.ok) {
    return {
      ok: false,
      task: 'scoring',
      content: null,
      provider: res.provider ?? null,
      model: res.model ?? null,
      prompt_version: defaults.version,
      error: res.error,
      skipped: Boolean(res.skipped) || !status.available,
    }
  }

  const parsed = parseScoringResponse(res.text)
  if (!parsed) {
    return {
      ok: false,
      task: 'scoring',
      content: null,
      provider: res.provider,
      model: res.model,
      prompt_version: defaults.version,
      error: "Parsing JSON scoring échoué",
    }
  }

  return {
    ok: true,
    task: 'scoring',
    content: parsed,
    provider: res.provider,
    model: res.model,
    prompt_version: defaults.version,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
  }
}

/* ─── Runner générique ──────────────────────────────────────────────── */

type Parser<T> = (raw: string) => T | null | T[]

async function runTask<T>(
  task: ArticleAiTask,
  ctx: ArticleContext,
  builder: (ctx: ArticleContext) => { system: string; prompt: string },
  parser: Parser<T>
): Promise<ArticleAiResponse<T>> {
  const defaults = DEFAULTS[task]
  const status = getAiStatus()

  if (!status.available) {
    return {
      ok: false,
      task,
      content: null,
      provider: null,
      model: null,
      prompt_version: defaults.version,
      skipped: true,
      error: 'Aucun provider IA configuré',
    }
  }

  const { system, prompt } = builder(ctx)
  const res = await generateText({
    prompt,
    system,
    action: defaults.action,
    temperature: defaults.temperature,
    maxTokens: defaults.max_tokens,
  })

  if (!res.ok) {
    return {
      ok: false,
      task,
      content: null,
      provider: res.provider ?? null,
      model: res.model ?? null,
      prompt_version: defaults.version,
      error: res.error,
      skipped: Boolean(res.skipped),
    }
  }

  const parsed = parser(res.text)
  if (parsed == null || (Array.isArray(parsed) && parsed.length === 0)) {
    return {
      ok: false,
      task,
      content: null,
      provider: res.provider,
      model: res.model,
      prompt_version: defaults.version,
      error: 'Parsing réponse IA échoué',
    }
  }

  return {
    ok: true,
    task,
    content: parsed as T,
    provider: res.provider,
    model: res.model,
    prompt_version: defaults.version,
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
    generated_at: new Date().toISOString(),
    subject: args.subject,
    angle: args.angle,
    instructions: args.instructions,
    quality_score: args.quality_score,
  }
}

export type { ArticleScoringResult }
