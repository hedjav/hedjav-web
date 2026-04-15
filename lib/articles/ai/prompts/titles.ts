import { composeArticleSystem } from './_system'
import { parseJsonLoose } from './parse'
import { _buildUserPromptShared } from './angles'
import type { ArticleTitleIdea } from '../../types'
import type { ArticleContext } from '../context'

export const TITLES_PROMPT_VERSION = 'articles/titles@v1'

export function buildTitlesPrompt(
  ctx: ArticleContext,
  angle?: string,
  expertPrompt: string | null = null,
): { system: string; prompt: string } {
  const system = composeArticleSystem(`
Tu proposes **5 à 8 titres d'article** optimisés lecture + SEO pour le blog egp.hedjav.com.

Sortie attendue : **JSON strict** (pas de markdown fence), tableau d'objets :

[
  {
    "title": "Titre 50-65 caractères idéal pour Google, sans clickbait cheap",
    "hook": "1 phrase qui vend l'article, utilisable en ouverture ou en meta description",
    "seo_keywords": ["3 à 6 mots-clés naturels, sans bourrage"]
  }
]

Règles :
- Varier les formats : guide, chiffré, question, comparaison, erreurs à éviter, cas pratique…
- Pas de majuscules à chaque mot. Style français standard.
- Pas de titres racoleurs type "CHOQUANT" ou "vous ne devinerez jamais".
- Intégrer FCFA, UEMOA, BRVM quand c'est pertinent pour le sujet.
- Ne jamais dépasser 70 caractères.
`, expertPrompt)

  const angleHint = angle ? `ANGLE IMPOSÉ : ${angle}\n` : ''
  const task = `${angleHint}TÂCHE : Propose 5 à 8 titres au format JSON strict. Rien d'autre.`
  const prompt = _buildUserPromptShared(ctx, task)
  return { system, prompt }
}

export function parseTitlesResponse(raw: string): ArticleTitleIdea[] {
  const parsed = parseJsonLoose<unknown>(raw)
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item): ArticleTitleIdea | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      if (typeof r.title !== 'string') return null
      const kw = Array.isArray(r.seo_keywords)
        ? (r.seo_keywords as unknown[]).filter((k): k is string => typeof k === 'string').slice(0, 6)
        : []
      return {
        title: r.title.slice(0, 100),
        hook: typeof r.hook === 'string' ? r.hook.slice(0, 200) : '',
        seo_keywords: kw,
      }
    })
    .filter((t): t is ArticleTitleIdea => t !== null)
    .slice(0, 8)
}
