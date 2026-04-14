/**
 * @deprecated Utiliser `@/lib/ai/client` à la place.
 *
 * Ce fichier est maintenu pour la compatibilité avec les call-sites existants.
 * Il délègue toute la logique à la couche IA unifiée, qui sait parler à
 * OpenAI et Anthropic sans changement côté consommateur.
 *
 * Nouveau code : importer `generateText` depuis `@/lib/ai/client`.
 */

import { generateText as aiGenerateText } from '@/lib/ai/client'

type GenerateOptions = {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
}

type GenerateResult =
  | { ok: true; text: string }
  | { ok: false; error: string; skipped?: boolean }

/**
 * Wrapper historique. Conserve la signature d'origine pour ne pas casser
 * les call-sites existants. La logique réelle est dans `lib/ai/client.ts`.
 */
export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const result = await aiGenerateText({
    prompt: opts.prompt,
    system: opts.system,
    model: opts.model,
    maxTokens: opts.maxTokens,
    action: 'legacy_claude_wrapper',
  })

  if (result.ok) {
    return { ok: true, text: result.text }
  }
  return {
    ok: false,
    error: result.error,
    skipped: result.skipped,
  }
}
