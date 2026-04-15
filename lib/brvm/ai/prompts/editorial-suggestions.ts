/**
 * Use case P4 — Suggestions éditoriales.
 *
 * À partir du contexte BRVM courant, propose 5 à 10 idées d'articles avec
 * titre, angle, priorité et catégorie. Utilisé depuis /admin/brvm et
 * /admin/articles pour gonfler la file de brouillons.
 *
 * Sortie : JSON array parsable.
 */

import type { BrvmAiContext } from '../types'
import { formatFacets, formatMarketSnippet, formatTopDocs } from '../context'
import { composeSystem } from './_system'

export function buildEditorialSuggestionsPrompt(ctx: BrvmAiContext): {
  system: string
  prompt: string
} {
  const system = composeSystem(`
Tu es éditeur en chef de egp.hedjav.com. Tu sors 5 à 8 idées d'articles pertinentes à partir de la veille BRVM de la période.

Sortie : **JSON array strict**, pas de prose en dehors. Schéma :

[
  {
    "title": "Titre (max 65 caractères)",
    "angle": "1-2 phrases qui disent ce que l'article apporte au lecteur",
    "priority": "high" | "medium" | "low",
    "category": "BRVM" | "Patrimoine" | "Investissement" | "Stratégie" | "UEMOA",
    "universe": "market" | "report" | "announcement" | "publication" | "cross",
    "inspiration_docs": ["titres courts des docs qui inspirent l'idée, max 3"]
  }
]

Règles :
- Diversifier les univers et les catégories (pas 5 articles BRVM d'affilée).
- Priorité = valeur éditoriale, pas fréquence de publication BRVM.
- Titre = utile au lecteur UEMOA qui veut comprendre / agir, pas racoleur.
- Zéro titre de type "10 choses que..." ou "Secret révélé".
`)

  const reports = ctx.docs.report ?? []
  const announcements = ctx.docs.announcement ?? []
  const publications = ctx.docs.publication ?? []

  const prompt = `CONTEXTE — Période ${ctx.period.label.toLowerCase()} (${ctx.total_docs} documents)

${formatMarketSnippet(ctx)}

${formatFacets(ctx.facets)}

${reports.length > 0 ? `RAPPORTS (${reports.length}) :\n${formatTopDocs(reports, 15)}\n` : ''}
${announcements.length > 0 ? `ANNONCES (${announcements.length}) :\n${formatTopDocs(announcements, 20)}\n` : ''}
${publications.length > 0 ? `PUBLICATIONS (${publications.length}) :\n${formatTopDocs(publications, 10)}\n` : ''}

TÂCHE : Produis 5 à 8 idées d'articles au format JSON array strict.`

  return { system, prompt }
}

export type EditorialSuggestion = {
  title: string
  angle: string
  priority: 'high' | 'medium' | 'low'
  category: string
  universe: 'market' | 'report' | 'announcement' | 'publication' | 'cross'
  inspiration_docs: string[]
}

export function parseEditorialSuggestions(raw: string): EditorialSuggestion[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (p): p is EditorialSuggestion =>
          typeof p === 'object' &&
          p !== null &&
          typeof (p as EditorialSuggestion).title === 'string' &&
          typeof (p as EditorialSuggestion).angle === 'string' &&
          ['high', 'medium', 'low'].includes((p as EditorialSuggestion).priority)
      )
      .slice(0, 10)
  } catch {
    return []
  }
}
