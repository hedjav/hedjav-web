/**
 * Parsers JSON partagés. Les modèles DeepSeek/OpenAI/Anthropic ajoutent
 * souvent un fence ```json … ``` ou quelques mots d'intro — ces utilitaires
 * nettoient avant JSON.parse pour éviter les faux négatifs.
 */

export function stripCodeFence(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

/** Extrait le premier bloc JSON (objet ou tableau) et tente un parse. */
export function parseJsonLoose<T>(raw: string): T | null {
  const cleaned = stripCodeFence(raw)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Fallback : extraire la première paire {…} ou […] valide
    const firstObj = cleaned.match(/\{[\s\S]*\}/)?.[0]
    const firstArr = cleaned.match(/\[[\s\S]*\]/)?.[0]
    const candidate = firstObj ?? firstArr
    if (!candidate) return null
    try {
      return JSON.parse(candidate) as T
    } catch {
      return null
    }
  }
}
