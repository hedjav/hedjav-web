/**
 * Façade IA BRVM — point d'entrée unique pour les 7 use cases.
 *
 * Utilisation :
 *   const result = await generateBrvmContent('daily_digest', { period: 'today' })
 *   if (result.ok) console.log(result.content)
 *
 * Chaque use case :
 *   - construit son contexte via buildBrvmAiContext()
 *   - compose son prompt via les modules prompts/*.ts
 *   - appelle generateText() via la couche IA unifiée
 *   - retourne une réponse normalisée BrvmAiResponse
 *
 * Aucun prompt n'est hardcodé ici — tout vit dans prompts/.
 */

import { generateText, getAiStatus } from '@/lib/ai/client'
import { buildBrvmAiContext } from './context'
import { buildAdminAlertPrompt } from './prompts/admin-alert'
import { buildDailyDigestPrompt } from './prompts/daily-digest'
import { buildWeeklyDigestPrompt } from './prompts/weekly-digest'
import { buildMonthlyDigestPrompt } from './prompts/monthly-digest'
import {
  buildArticleDraftPrompt,
  parseArticleDraft,
  type ArticleDraftFocus,
} from './prompts/article-draft'
import {
  buildEditorialSuggestionsPrompt,
  parseEditorialSuggestions,
  type EditorialSuggestion,
} from './prompts/editorial-suggestions'
import {
  buildScoringPrompt,
  heuristicScoring,
  parseScoringResult,
  type ScoringResult,
} from './prompts/scoring'
import type {
  BrvmAiContext,
  BrvmAiOptions,
  BrvmAiResponse,
  BrvmAiUseCase,
  EnrichedDocument,
} from './types'
import type { DocFamily } from '../types'

/** Paramètres IA par défaut par use case. */
const DEFAULTS: Record<
  BrvmAiUseCase,
  { temperature: number; max_tokens: number }
> = {
  admin_alert: { temperature: 0.4, max_tokens: 600 },
  daily_digest: { temperature: 0.5, max_tokens: 700 },
  weekly_digest: { temperature: 0.5, max_tokens: 1200 },
  monthly_digest: { temperature: 0.55, max_tokens: 1600 },
  article_draft: { temperature: 0.65, max_tokens: 2400 },
  editorial_suggestions: { temperature: 0.6, max_tokens: 1200 },
  document_scoring: { temperature: 0.2, max_tokens: 400 },
}

function buildContextSummary(ctx: BrvmAiContext) {
  const families = Object.keys(ctx.docs) as DocFamily[]
  const topSectors = Object.entries(ctx.facets.by_sector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s)
  return {
    total_docs: ctx.total_docs,
    period_label: ctx.period.label,
    families_touched: families,
    top_sectors: topSectors,
  }
}

function emptyContextSummary() {
  return {
    total_docs: 0,
    period_label: 'indéterminée',
    families_touched: [] as DocFamily[],
    top_sectors: [] as string[],
  }
}

/* ─── Digests textuels (admin_alert / daily / weekly / monthly) ──────── */

async function runTextUseCase(
  use_case: BrvmAiUseCase,
  ctx: BrvmAiContext,
  builder: (ctx: BrvmAiContext) => { system: string; prompt: string },
  options: BrvmAiOptions
): Promise<BrvmAiResponse<string>> {
  const { system, prompt } = builder(ctx)
  const defaults = DEFAULTS[use_case]
  const status = getAiStatus()

  const res = await generateText({
    prompt,
    system,
    action: `brvm_${use_case}`,
    temperature: options.temperature ?? defaults.temperature,
    maxTokens: options.max_tokens ?? defaults.max_tokens,
  })

  const summary = buildContextSummary(ctx)
  if (res.ok) {
    return {
      ok: true,
      use_case,
      provider: res.provider,
      model: res.model,
      content: res.text,
      usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
      context_summary: summary,
    }
  }

  return {
    ok: false,
    use_case,
    provider: res.provider ?? null,
    model: res.model ?? null,
    content: null,
    error: res.error ?? 'IA non disponible',
    skipped: Boolean(res.skipped) || !status.available,
    context_summary: summary,
  }
}

/* ─── Article draft ──────────────────────────────────────────────────── */

export async function generateBrvmArticleDraft(
  options: BrvmAiOptions & { focus?: ArticleDraftFocus } = {}
): Promise<BrvmAiResponse<{ title: string; excerpt: string; category: string; body: string }>> {
  const ctx = await buildBrvmAiContext(options)
  const { system, prompt } = buildArticleDraftPrompt(ctx, options.focus)
  const defaults = DEFAULTS.article_draft
  const status = getAiStatus()

  const res = await generateText({
    prompt,
    system,
    action: 'brvm_article_draft',
    temperature: options.temperature ?? defaults.temperature,
    maxTokens: options.max_tokens ?? defaults.max_tokens,
  })

  const summary = buildContextSummary(ctx)
  if (!res.ok) {
    return {
      ok: false,
      use_case: 'article_draft',
      provider: res.provider ?? null,
      model: res.model ?? null,
      content: null,
      error: res.error,
      skipped: Boolean(res.skipped) || !status.available,
      context_summary: summary,
    }
  }

  const parsed = parseArticleDraft(res.text)
  if (!parsed) {
    return {
      ok: false,
      use_case: 'article_draft',
      provider: res.provider,
      model: res.model,
      content: null,
      error: "Parsing JSON article_draft échoué",
      context_summary: summary,
    }
  }

  return {
    ok: true,
    use_case: 'article_draft',
    provider: res.provider,
    model: res.model,
    content: parsed,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
    context_summary: summary,
  }
}

/* ─── Suggestions éditoriales ────────────────────────────────────────── */

export async function generateBrvmEditorialSuggestions(
  options: BrvmAiOptions = {}
): Promise<BrvmAiResponse<EditorialSuggestion[]>> {
  const ctx = await buildBrvmAiContext(options)
  const { system, prompt } = buildEditorialSuggestionsPrompt(ctx)
  const defaults = DEFAULTS.editorial_suggestions
  const status = getAiStatus()

  const res = await generateText({
    prompt,
    system,
    action: 'brvm_editorial_suggestions',
    temperature: options.temperature ?? defaults.temperature,
    maxTokens: options.max_tokens ?? defaults.max_tokens,
  })

  const summary = buildContextSummary(ctx)
  if (!res.ok) {
    return {
      ok: false,
      use_case: 'editorial_suggestions',
      provider: res.provider ?? null,
      model: res.model ?? null,
      content: null,
      error: res.error,
      skipped: Boolean(res.skipped) || !status.available,
      context_summary: summary,
    }
  }

  const parsed = parseEditorialSuggestions(res.text)
  return {
    ok: true,
    use_case: 'editorial_suggestions',
    provider: res.provider,
    model: res.model,
    content: parsed,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
    context_summary: summary,
  }
}

/* ─── Scoring document ───────────────────────────────────────────────── */

export async function scoreBrvmDocument(
  doc: EnrichedDocument,
  options: Pick<BrvmAiOptions, 'temperature' | 'max_tokens'> = {}
): Promise<BrvmAiResponse<ScoringResult>> {
  const { system, prompt } = buildScoringPrompt(doc)
  const defaults = DEFAULTS.document_scoring
  const status = getAiStatus()
  const emptySummary = emptyContextSummary()

  if (!status.available) {
    const fallback = heuristicScoring(doc)
    return {
      ok: true,
      use_case: 'document_scoring',
      provider: null,
      model: null,
      content: fallback,
      skipped: true,
      fallback_used: true,
      context_summary: emptySummary,
    }
  }

  const res = await generateText({
    prompt,
    system,
    action: 'brvm_document_scoring',
    temperature: options.temperature ?? defaults.temperature,
    maxTokens: options.max_tokens ?? defaults.max_tokens,
  })

  if (!res.ok) {
    const fallback = heuristicScoring(doc)
    return {
      ok: true,
      use_case: 'document_scoring',
      provider: res.provider ?? null,
      model: res.model ?? null,
      content: fallback,
      fallback_used: true,
      error: res.error,
      context_summary: emptySummary,
    }
  }

  const parsed = parseScoringResult(res.text) ?? heuristicScoring(doc)
  return {
    ok: true,
    use_case: 'document_scoring',
    provider: res.provider,
    model: res.model,
    content: parsed,
    usage: { total_tokens: res.usage?.total_tokens, duration_ms: res.duration_ms },
    fallback_used: parseScoringResult(res.text) === null,
    context_summary: emptySummary,
  }
}

/* ─── Façade générique pour les use cases textuels ───────────────────── */

export async function generateBrvmContent(
  kind: 'admin_alert' | 'daily_digest' | 'weekly_digest' | 'monthly_digest',
  options: BrvmAiOptions = {}
): Promise<BrvmAiResponse<string>> {
  // Préréglages de période par type de digest
  const defaultPeriod: Record<typeof kind, BrvmAiOptions['period']> = {
    admin_alert: 'today',
    daily_digest: 'today',
    weekly_digest: '7d',
    monthly_digest: '30d',
  }
  const period = options.period ?? defaultPeriod[kind]
  const ctx = await buildBrvmAiContext({ ...options, period })

  const builders = {
    admin_alert: buildAdminAlertPrompt,
    daily_digest: buildDailyDigestPrompt,
    weekly_digest: buildWeeklyDigestPrompt,
    monthly_digest: buildMonthlyDigestPrompt,
  } as const

  return runTextUseCase(kind, ctx, builders[kind], options)
}

export type { BrvmAiResponse, BrvmAiUseCase, EnrichedDocument } from './types'
