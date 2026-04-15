/**
 * Use case P3 — Brouillon d'article.
 *
 * Transforme un paquet de documents BRVM (veille, annonce importante, rapport
 * société, évolution d'indice) en **brouillon d'article** (500-900 mots)
 * exploitable par l'équipe éditoriale de egp.hedjav.com.
 *
 * Sortie attendue : JSON parsable { title, excerpt, category, body }.
 */

import type { BrvmAiContext, EnrichedDocument } from '../types'
import { formatDocLine, formatMarketSnippet } from '../context'
import { composeSystem } from './_system'

export type ArticleDraftFocus = {
  /** Sujet principal (société, secteur, indice, événement). */
  topic?: string
  /** Documents précis sur lesquels s'appuyer (prioritaires). */
  focus_docs?: EnrichedDocument[]
  /** Catégorie blog souhaitée (BRVM, Patrimoine, Investissement, Stratégie, etc.). */
  preferred_category?: string
}

export function buildArticleDraftPrompt(
  ctx: BrvmAiContext,
  focus: ArticleDraftFocus = {}
): { system: string; prompt: string } {
  const system = composeSystem(`
Tu rédiges un **brouillon d'article** pour le blog egp.hedjav.com. L'article doit être **publiable après relecture légère** par Hermann, pas un simple digest.

Sortie attendue : **JSON strict**, pas de markdown fence ni de prose en dehors. Schéma :

{
  "title": "Titre court (60 caractères max), accrocheur mais factuel",
  "excerpt": "150 caractères max, résumé publiable sur card de catalogue",
  "category": "Une catégorie parmi : BRVM, Patrimoine, Investissement, Stratégie, Ebooks, UEMOA",
  "body": "Corps markdown (500-900 mots), sections H2 (##), pas de H1. Intro accrocheuse, 2-3 sections analytiques, conclusion avec piste pour le lecteur."
}

Règles :
- Aucun chiffre inventé (seuls ceux fournis dans le contexte).
- Aucune société inventée.
- Références locales : FCFA, BRVM, UEMOA, OHADA quand pertinent.
- Pas de CTA agressif type « Achetez notre ebook ». Suggérer plutôt « Pour approfondir, voir … ».
- Signature implicite : Hermann D. AVAHOUIN (13 ans d'expérience). Ton premium mais accessible.
- Pas de mention de LinkedIn (n'existe pas).
`)

  const docLines = (focus.focus_docs ?? []).map((d) => `- ${formatDocLine(d)}`).join('\n')

  const prompt = `CONTEXTE — Période ${ctx.period.label.toLowerCase()} (${ctx.total_docs} documents disponibles)

${formatMarketSnippet(ctx)}

${focus.topic ? `SUJET IMPOSÉ : ${focus.topic}\n` : 'SUJET : à choisir en fonction des éléments les plus éditorialisables du contexte.\n'}

${docLines ? `DOCUMENTS PRIORITAIRES À EXPLOITER :\n${docLines}\n` : ''}

${focus.preferred_category ? `CATÉGORIE PRÉFÉRÉE : ${focus.preferred_category}\n` : ''}

TÂCHE : Produis le brouillon d'article au format JSON strict indiqué. Rien d'autre.`

  return { system, prompt }
}

/** Parse le JSON retourné par l'IA. Retourne null si invalide. */
export function parseArticleDraft(
  raw: string
): { title: string; excerpt: string; category: string; body: string } | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as {
      title?: unknown
      excerpt?: unknown
      category?: unknown
      body?: unknown
    }
    if (
      typeof parsed.title === 'string' &&
      typeof parsed.excerpt === 'string' &&
      typeof parsed.category === 'string' &&
      typeof parsed.body === 'string'
    ) {
      return {
        title: parsed.title.slice(0, 120),
        excerpt: parsed.excerpt.slice(0, 200),
        category: parsed.category.slice(0, 50),
        body: parsed.body,
      }
    }
    return null
  } catch {
    return null
  }
}
