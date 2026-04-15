/**
 * Use case P2 — Digest journalier.
 *
 * Synthèse courte (150-220 mots) exploitable en email admin ou en snippet
 * /admin/brvm. Présente les nouveautés du jour groupées par pertinence et
 * non par simple chronologie.
 */

import type { BrvmAiContext } from '../types'
import { formatFacets, formatMarketSnippet, formatTopDocs } from '../context'
import { composeSystem } from './_system'

export function buildDailyDigestPrompt(ctx: BrvmAiContext): {
  system: string
  prompt: string
} {
  const system = composeSystem(`
Tu rédiges un **digest journalier BRVM** pour l'administrateur.

Format :
- 150 à 220 mots
- 2 à 3 paragraphes
- Structure implicite : 1) ce qui domine aujourd'hui (rapports, annonces marquantes), 2) signaux sectoriels ou indiciels, 3) pistes éditoriales à creuser
- Zéro emoji, zéro titre markdown, zéro intro type « Voici le digest »
- Si aucun document n'a été publié, dis-le en une phrase et ajoute un contexte marché bref si disponible
- Si un chiffre est cité, il doit venir du contexte fourni
`)

  const reports = ctx.docs.report ?? []
  const announcements = ctx.docs.announcement ?? []
  const publications = ctx.docs.publication ?? []

  const docsBlock = [
    reports.length > 0 ? `RAPPORTS (${reports.length}) :\n${formatTopDocs(reports, 12)}` : null,
    announcements.length > 0
      ? `ANNONCES ÉMETTEURS (${announcements.length}) :\n${formatTopDocs(announcements, 15)}`
      : null,
    publications.length > 0
      ? `PUBLICATIONS BRVM (${publications.length}) :\n${formatTopDocs(publications, 10)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const prompt = `CONTEXTE — Période ${ctx.period.label.toLowerCase()} (${ctx.total_docs} nouveautés)

${formatMarketSnippet(ctx)}

${formatFacets(ctx.facets)}

${docsBlock || '(Aucun document nouveau sur la période.)'}

TÂCHE : Rédige le digest journalier selon le format demandé. Démarre directement par le contenu.`

  return { system, prompt }
}
