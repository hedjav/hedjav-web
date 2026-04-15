/**
 * Catégories officielles du blog Hedjav / EGP.
 *
 * Liste volontairement courte et cohérente avec la ligne éditoriale
 * (patrimoine UEMOA + marché BRVM). Étendre ici plutôt que d'accepter du
 * texte libre — ça garde la taxonomie propre côté blog public.
 */
export const ARTICLE_CATEGORIES = [
  'BRVM',
  'Patrimoine',
  'Finance personnelle',
  'Immobilier',
  'Entrepreneuriat',
  'IA & productivité',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

/**
 * Normalise une catégorie libre vers une catégorie officielle.
 * Inconnue → null (l'appelant décide : erreur ou valeur par défaut).
 */
export function normaliseCategory(raw: string | null | undefined): ArticleCategory | null {
  if (!raw) return null
  const needle = raw.trim().toLowerCase()
  const hit = ARTICLE_CATEGORIES.find((c) => c.toLowerCase() === needle)
  if (hit) return hit
  // Tolérance sur variantes connues
  const aliases: Record<string, ArticleCategory> = {
    bourse: 'BRVM',
    'brvm uemoa': 'BRVM',
    patrimoine: 'Patrimoine',
    'gestion de patrimoine': 'Patrimoine',
    'finance perso': 'Finance personnelle',
    ia: 'IA & productivité',
    'ia & productivite': 'IA & productivité',
    'ia et productivite': 'IA & productivité',
  }
  return aliases[needle] ?? null
}

export function isValidCategory(value: unknown): value is ArticleCategory {
  return typeof value === 'string' && (ARTICLE_CATEGORIES as readonly string[]).includes(value)
}
