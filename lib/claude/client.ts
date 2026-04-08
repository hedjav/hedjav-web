/**
 * Client Claude API — utilisé pour générer du contenu (newsletter, emails,
 * articles auto plus tard). Wrapper minimal sur l'API Anthropic Messages.
 *
 * Variables d'env requises : ANTHROPIC_API_KEY
 * Modèle par défaut : claude-sonnet-4-6
 */

const API = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

type GenerateOptions = {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
}

type GenerateResult =
  | { ok: true; text: string }
  | { ok: false; error: string; skipped?: boolean }

export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[claude] ANTHROPIC_API_KEY not set, skipping generation')
    return { ok: false, error: 'ANTHROPIC_API_KEY not set', skipped: true }
  }

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  }

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Claude ${res.status}: ${text}` }
    }
    const data = await res.json()
    const text =
      Array.isArray(data?.content) && data.content[0]?.text
        ? (data.content[0].text as string)
        : ''
    return { ok: true, text }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: message }
  }
}
