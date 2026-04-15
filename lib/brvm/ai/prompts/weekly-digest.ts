/**
 * Use case P2 — Digest hebdomadaire.
 *
 * Synthèse plus structurée (300-450 mots) avec sections explicites. Pensée
 * pour un email admin de vendredi soir qui boucle la semaine + pour
 * servir de matière à un article éditorial.
 */

import type { BrvmAiContext } from '../types'
import { formatFacets, formatMarketSnippet, formatTopDocs } from '../context'
import { composeSystem } from './_system'

export function buildWeeklyDigestPrompt(ctx: BrvmAiContext): {
  system: string
  prompt: string
} {
  const system = composeSystem(`
Tu rédiges un **digest hebdomadaire BRVM** structuré, pensé pour un email admin du vendredi soir (ou une base d'article éditorial Hedjav).

Format attendu (utilise des titres courts en **gras markdown**) :

**Principaux faits**
— 3 à 5 puces concises (max 25 mots chacune)

**Sociétés marquantes**
— 2 à 4 lignes, avec la société et l'événement qui la met en avant

**Secteurs actifs**
— 1 à 2 phrases sur les secteurs qui concentrent l'attention

**Tendances observées**
— 1 paragraphe (60-100 mots) qui prend du recul : continuité, rupture, signal faible

**Sujets éditoriaux potentiels**
— 2 à 3 suggestions (titre d'article potentiel + angle en 1 ligne)

Règles :
- Total 300-450 mots
- Aucun chiffre inventé
- Aucune société inventée
- Ton analytique, jamais promotionnel
`)

  const reports = ctx.docs.report ?? []
  const announcements = ctx.docs.announcement ?? []
  const publications = ctx.docs.publication ?? []

  const prompt = `CONTEXTE — Semaine ${ctx.period.label.toLowerCase()} (${ctx.total_docs} documents, ${ctx.facets.top_emetteurs.length} émetteurs actifs)

${formatMarketSnippet(ctx)}

${formatFacets(ctx.facets)}

${reports.length > 0 ? `RAPPORTS (${reports.length}) :\n${formatTopDocs(reports, 20)}\n` : ''}
${announcements.length > 0 ? `ANNONCES (${announcements.length}) :\n${formatTopDocs(announcements, 25)}\n` : ''}
${publications.length > 0 ? `PUBLICATIONS (${publications.length}) :\n${formatTopDocs(publications, 15)}\n` : ''}

TÂCHE : Rédige le digest hebdomadaire au format demandé. Pas d'intro.`

  return { system, prompt }
}
