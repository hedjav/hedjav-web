/**
 * Couche IA unifiée Hedjav / EGP.
 *
 * Objectif : une seule API (`generateText`) qui sait parler à plusieurs
 * providers (OpenAI, Anthropic) sans que les call-sites aient à choisir.
 *
 * Règles de sécurité :
 *  - Aucune clé n'est jamais écrite en dur.
 *  - Les clés sont lues uniquement depuis process.env.
 *  - Les clés ne sont jamais loggées, ni retournées dans la réponse.
 *  - Si aucun provider n'est configuré, on dégrade proprement
 *    (`{ ok: false, skipped: true }`) sans casser l'application.
 *
 * Variables d'environnement :
 *  - OPENAI_API_KEY        → obligatoire pour provider "openai"
 *  - ANTHROPIC_API_KEY     → obligatoire pour provider "anthropic"
 *  - DEEPSEEK_API_KEY      → obligatoire pour provider "deepseek"
 *  - DEEPSEEK_MODEL        → optionnel : modèle DeepSeek (défaut deepseek-chat)
 *  - AI_PROVIDER           → optionnel : "deepseek" | "openai" | "anthropic" | "auto"
 *                            (défaut : "auto" → DeepSeek > OpenAI > Anthropic,
 *                             sinon skip proprement)
 *
 * Modèles par défaut :
 *  - DeepSeek   : deepseek-chat (API OpenAI-compatible, rapport qualité/prix élevé)
 *  - OpenAI     : gpt-4o-mini (rapide, bon marché, qualité acceptable)
 *  - Anthropic  : claude-sonnet-4-6
 *
 * Extensibilité :
 *  - Pour ajouter un nouveau provider, implémenter `ProviderCall`
 *    et l'ajouter dans `providers`.
 */

// ------------------------------------------------------------------
// Types publics
// ------------------------------------------------------------------

export type AiProvider = 'openai' | 'anthropic' | 'deepseek'

export type AiGenerateOptions = {
  /** Prompt utilisateur. Requis. */
  prompt: string
  /** System prompt (instructions). Optionnel. */
  system?: string
  /** Modèle spécifique. Si absent : défaut du provider. */
  model?: string
  /** Nombre max de tokens de réponse. Défaut : 2048. */
  maxTokens?: number
  /** Provider forcé pour cet appel (outrepasse AI_PROVIDER). */
  provider?: AiProvider
  /** Température (0.0-1.0). Défaut : 0.7. */
  temperature?: number
  /** Action logique pour les logs (ex: "brvm_summary", "article_gen"). */
  action?: string
}

export type AiUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type AiGenerateSuccess = {
  ok: true
  text: string
  provider: AiProvider
  model: string
  usage?: AiUsage
  duration_ms: number
}

export type AiGenerateError = {
  ok: false
  error: string
  /** true si skip intentionnel (pas de clé, pas de provider configuré). */
  skipped?: boolean
  provider?: AiProvider
  model?: string
  duration_ms?: number
}

export type AiGenerateResult = AiGenerateSuccess | AiGenerateError

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-chat',
}

const DEFAULT_MAX_TOKENS = 2048
const DEFAULT_TEMPERATURE = 0.7
const REQUEST_TIMEOUT_MS = 60_000

// ------------------------------------------------------------------
// Détection du provider actif
// ------------------------------------------------------------------

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10)
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10)
}

function hasDeepSeekKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 10)
}

/**
 * Retourne le provider à utiliser.
 * - Respecte AI_PROVIDER si défini et disponible.
 * - Sinon fallback automatique (DeepSeek > OpenAI > Anthropic).
 * - Retourne null si aucun provider dispo → skip propre.
 */
function resolveProvider(forced?: AiProvider): AiProvider | null {
  // Force explicite par l'appelant
  if (forced) {
    if (forced === 'deepseek' && hasDeepSeekKey()) return 'deepseek'
    if (forced === 'openai' && hasOpenAIKey()) return 'openai'
    if (forced === 'anthropic' && hasAnthropicKey()) return 'anthropic'
    return null
  }

  // Via env
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase()
  if (envProvider === 'deepseek' && hasDeepSeekKey()) return 'deepseek'
  if (envProvider === 'openai' && hasOpenAIKey()) return 'openai'
  if (envProvider === 'anthropic' && hasAnthropicKey()) return 'anthropic'

  // Auto-détection : DeepSeek prioritaire (choix produit), puis OpenAI, puis Anthropic
  if (hasDeepSeekKey()) return 'deepseek'
  if (hasOpenAIKey()) return 'openai'
  if (hasAnthropicKey()) return 'anthropic'

  return null
}

export function getAvailableProviders(): AiProvider[] {
  const list: AiProvider[] = []
  if (hasDeepSeekKey()) list.push('deepseek')
  if (hasOpenAIKey()) list.push('openai')
  if (hasAnthropicKey()) list.push('anthropic')
  return list
}

/**
 * Indique si l'IA est opérationnelle (au moins un provider configuré).
 * À utiliser pour afficher l'état dans l'admin, désactiver des boutons, etc.
 */
export function isAiAvailable(): boolean {
  return getAvailableProviders().length > 0
}

// ------------------------------------------------------------------
// Provider : OpenAI
// ------------------------------------------------------------------

type ProviderCall = (opts: AiGenerateOptions & { model: string }) => Promise<{
  text: string
  usage?: AiUsage
}>

const callOpenAI: ProviderCall = async (opts) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const messages: Array<{ role: string; content: string }> = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: opts.prompt })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      // On censure toute clé potentielle dans les logs
      const safeErr = sanitizeLog(errText).slice(0, 500)
      throw new Error(`OpenAI ${res.status}: ${safeErr}`)
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    const usage: AiUsage | undefined = data?.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        }
      : undefined

    return { text, usage }
  } finally {
    clearTimeout(timeout)
  }
}

// ------------------------------------------------------------------
// Provider : Anthropic (Claude)
// ------------------------------------------------------------------

const callAnthropic: ProviderCall = async (opts) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const safeErr = sanitizeLog(errText).slice(0, 500)
      throw new Error(`Anthropic ${res.status}: ${safeErr}`)
    }

    const data = await res.json()
    const text: string = Array.isArray(data?.content) && data.content[0]?.text
      ? data.content[0].text
      : ''
    const usage: AiUsage | undefined = data?.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens:
            (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
        }
      : undefined

    return { text, usage }
  } finally {
    clearTimeout(timeout)
  }
}

// ------------------------------------------------------------------
// Provider : DeepSeek (API OpenAI-compatible)
// ------------------------------------------------------------------

const callDeepSeek: ProviderCall = async (opts) => {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set')

  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  const model = process.env.DEEPSEEK_MODEL || opts.model

  const messages: Array<{ role: string; content: string }> = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: opts.prompt })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const safeErr = sanitizeLog(errText).slice(0, 500)
      throw new Error(`DeepSeek ${res.status}: ${safeErr}`)
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    const usage: AiUsage | undefined = data?.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        }
      : undefined

    return { text, usage }
  } finally {
    clearTimeout(timeout)
  }
}

// ------------------------------------------------------------------
// Map provider → implémentation
// ------------------------------------------------------------------

const providers: Record<AiProvider, ProviderCall> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  deepseek: callDeepSeek,
}

// ------------------------------------------------------------------
// Sanitization des logs (protège contre les fuites de clés)
// ------------------------------------------------------------------

/**
 * Redacte les clés API qui pourraient se retrouver dans des messages d'erreur
 * renvoyés par les providers. Ne change rien si rien n'est trouvé.
 */
function sanitizeLog(text: string): string {
  if (!text) return text
  return text
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-***REDACTED***')
    .replace(/Bearer\s+[A-Za-z0-9_-]{10,}/g, 'Bearer ***REDACTED***')
    .replace(/x-api-key['":\s]+[A-Za-z0-9_-]{10,}/gi, 'x-api-key: ***REDACTED***')
}

// ------------------------------------------------------------------
// Journalisation (optionnelle — soft-fail si table absente)
// ------------------------------------------------------------------

async function logIfPossible(data: {
  action: string
  provider: AiProvider
  model: string
  prompt?: string
  result?: string
  tokens_used?: number
  duration_ms: number
  status: 'success' | 'error'
  error_message?: string
}) {
  try {
    // Import dynamique pour éviter un cycle si log.ts évolue
    const { logAiCall } = await import('./log')
    await logAiCall({
      action: data.action,
      prompt: data.prompt ? data.prompt.slice(0, 8000) : undefined,
      result: data.result ? data.result.slice(0, 8000) : undefined,
      model: `${data.provider}:${data.model}`,
      tokens_used: data.tokens_used,
      duration_ms: data.duration_ms,
      status: data.status,
      error_message: data.error_message ? sanitizeLog(data.error_message) : undefined,
      created_by: 'ai-unified',
    })
  } catch {
    // Table ai_logs absente ou erreur de connexion : on n'empêche pas la réponse.
  }
}

// ------------------------------------------------------------------
// API publique : generateText
// ------------------------------------------------------------------

/**
 * Génère du texte via le provider IA disponible.
 *
 * @example
 * const r = await generateText({ prompt: "Résume ce marché BRVM..." })
 * if (r.ok) console.log(r.text)
 * else if (r.skipped) console.log("IA non configurée")
 * else console.error(r.error)
 */
export async function generateText(opts: AiGenerateOptions): Promise<AiGenerateResult> {
  const provider = resolveProvider(opts.provider)

  // Dégradation contrôlée si aucun provider
  if (!provider) {
    return {
      ok: false,
      error: 'No AI provider configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY)',
      skipped: true,
    }
  }

  const model = opts.model ?? DEFAULT_MODELS[provider]
  const action = opts.action ?? 'generate_text'
  const started = Date.now()

  try {
    const call = providers[provider]
    const result = await call({ ...opts, model })
    const duration_ms = Date.now() - started

    // Log best-effort (ne bloque pas la réponse)
    void logIfPossible({
      action,
      provider,
      model,
      prompt: opts.prompt,
      result: result.text,
      tokens_used: result.usage?.total_tokens,
      duration_ms,
      status: 'success',
    })

    return {
      ok: true,
      text: result.text,
      provider,
      model,
      usage: result.usage,
      duration_ms,
    }
  } catch (e) {
    const duration_ms = Date.now() - started
    const message = e instanceof Error ? e.message : 'unknown error'
    const safeMessage = sanitizeLog(message)

    void logIfPossible({
      action,
      provider,
      model,
      prompt: opts.prompt,
      duration_ms,
      status: 'error',
      error_message: safeMessage,
    })

    return {
      ok: false,
      error: safeMessage,
      provider,
      model,
      duration_ms,
    }
  }
}

// ------------------------------------------------------------------
// Helpers utilitaires
// ------------------------------------------------------------------

/**
 * Version "safe" qui retourne toujours une string, utile dans les call-sites
 * qui veulent un fallback textuel sans avoir à gérer le type union.
 */
export async function generateTextOrFallback(
  opts: AiGenerateOptions,
  fallback: string,
): Promise<string> {
  const result = await generateText(opts)
  return result.ok ? result.text : fallback
}

/**
 * Indique si un appel IA peut aboutir avec la config actuelle.
 * Utilisé par les boutons admin pour désactiver l'UI si pas de clé.
 */
export function getAiStatus(): {
  available: boolean
  provider: AiProvider | null
  providers: AiProvider[]
} {
  const available = resolveProvider()
  return {
    available: Boolean(available),
    provider: available,
    providers: getAvailableProviders(),
  }
}
