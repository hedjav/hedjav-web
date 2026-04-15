/**
 * Chargement du « prompt expert » optionnel pour les articles.
 *
 * Stocké dans `site_config.articles_expert_prompt` (migration 031).
 * Éditable depuis `/admin/config` (catégorie "IA") sans redéploiement.
 *
 * Comportement :
 *   - Valeur vide / non présente → retourne `null`, le système tourne sans
 *     cette troisième couche.
 *   - Valeur renseignée → retournée telle quelle, `composeArticleSystem`
 *     l'ajoute en fin de system prompt avec la priorité la plus forte.
 *
 * Un cache mémoire de 60 s évite de requêter Supabase à chaque appel IA.
 * Le cache est invalidable via `invalidateExpertPromptCache()` (utilisé
 * par l'action admin après édition).
 */

import { getConfig } from '@/lib/config/queries'

const CACHE_TTL_MS = 60_000

let cached: { value: string | null; fetched_at: number } | null = null

export async function loadArticlesExpertPrompt(): Promise<string | null> {
  const now = Date.now()
  if (cached && now - cached.fetched_at < CACHE_TTL_MS) {
    return cached.value
  }
  try {
    const raw = await getConfig('articles_expert_prompt')
    const value = raw?.trim() ? raw.trim() : null
    cached = { value, fetched_at: now }
    return value
  } catch (err) {
    console.warn('[articles/ai] loadArticlesExpertPrompt failed:', err)
    cached = { value: null, fetched_at: now }
    return null
  }
}

export function invalidateExpertPromptCache(): void {
  cached = null
}
