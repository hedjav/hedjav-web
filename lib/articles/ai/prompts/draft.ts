import { composeArticleSystem } from './_system'
import { parseJsonLoose } from './parse'
import { _buildUserPromptShared } from './angles'
import { ARTICLE_CATEGORIES, isValidCategory, type ArticleCategory } from '../../categories'
import type { ArticleDraftContent } from '../../types'
import type { ArticleContext } from '../context'

export const DRAFT_PROMPT_VERSION = 'articles/draft@v1'

export function buildDraftPrompt(
  ctx: ArticleContext,
  opts: { angle?: string; title?: string } = {}
): { system: string; prompt: string } {
  const categoriesList = ARTICLE_CATEGORIES.map((c) => `"${c}"`).join(', ')

  const system = composeArticleSystem(`
Tu rédiges un **brouillon d'article complet** pour egp.hedjav.com, **publiable après relecture légère** par Hermann. Pas un digest, pas un résumé : une vraie analyse éditoriale.

Sortie attendue : **JSON strict** (pas de markdown fence ni de texte hors JSON), objet unique :

{
  "title": "Titre final (≤70 caractères)",
  "excerpt": "Résumé ≤220 caractères, publiable sur carte de blog",
  "category": "UNE des valeurs exactes : ${categoriesList}",
  "body": "Corps markdown 700-1300 mots. Intro qui cadre le problème. 3 à 5 sections ##. Conclusion actionnable. Listes - quand pertinent. Aucun # de titre principal dans le corps."
}

Règles non négociables :
- Aucun chiffre, aucun nom propre, aucune citation qui ne soit pas dans le contexte fourni.
- Aucun disclaimer légal, aucun "ceci n'est pas un conseil en investissement".
- Aucun CTA agressif (pas de "Achetez notre ebook", pas de "Inscrivez-vous").
- Exemples concrets UEMOA : Dakar, Abidjan, Cotonou, Lomé, Ouagadougou, FCFA, BRVM, OHADA, CREPMF, BCEAO.
- La \`category\` DOIT être l'une des valeurs autorisées, copiée mot pour mot (casse + accent).
`)

  const parts: string[] = []
  if (opts.title) parts.push(`TITRE IMPOSÉ : ${opts.title}`)
  if (opts.angle) parts.push(`ANGLE DIRECTEUR : ${opts.angle}`)
  parts.push('TÂCHE : Produis le brouillon au format JSON strict indiqué. Rien d\'autre.')

  const prompt = _buildUserPromptShared(ctx, parts.join('\n'))
  return { system, prompt }
}

export function parseDraftResponse(raw: string): ArticleDraftContent | null {
  const parsed = parseJsonLoose<unknown>(raw)
  if (!parsed || typeof parsed !== 'object') return null
  const r = parsed as Record<string, unknown>
  if (typeof r.title !== 'string' || typeof r.excerpt !== 'string' || typeof r.body !== 'string') {
    return null
  }
  const rawCategory = typeof r.category === 'string' ? r.category.trim() : ''
  const category: ArticleCategory = isValidCategory(rawCategory)
    ? rawCategory
    : 'Patrimoine'
  return {
    title: r.title.trim().slice(0, 120),
    excerpt: r.excerpt.trim().slice(0, 240),
    category,
    body: r.body.trim(),
  }
}
