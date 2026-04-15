/**
 * Use case P2 — Digest mensuel.
 *
 * Prend de la hauteur : grandes évolutions, points d'attention, matière
 * pour contenu premium ou article stratégique.
 */

import type { BrvmAiContext } from '../types'
import { formatFacets, formatMarketSnippet, formatTopDocs } from '../context'
import { composeSystem } from './_system'

export function buildMonthlyDigestPrompt(ctx: BrvmAiContext): {
  system: string
  prompt: string
} {
  const system = composeSystem(`
Tu rédiges un **digest mensuel BRVM** analytique, conçu comme une base pour un article stratégique premium de la newsletter Hedjav.

Format attendu (titres en **gras markdown**) :

**Vue d'ensemble du mois**
— 2 à 3 phrases qui situent l'activité du mois.

**Grandes évolutions**
— 3 à 5 puces (max 30 mots chacune) sur les évolutions structurelles (secteur qui monte, indice qui décroche, société en mutation, etc.).

**Points d'attention**
— 2 à 4 signaux faibles ou risques à surveiller pour les mois à venir.

**Matière éditoriale**
— 3 à 5 idées d'articles premium avec titre proposé + angle en 1 phrase.

Règles :
- Total 400-600 mots
- Zéro chiffre inventé
- Zéro société inventée
- Ton réflexif, pas descriptif
`)

  const reports = ctx.docs.report ?? []
  const announcements = ctx.docs.announcement ?? []
  const publications = ctx.docs.publication ?? []

  const prompt = `CONTEXTE — Mois ${ctx.period.label.toLowerCase()} (${ctx.total_docs} documents)

${formatMarketSnippet(ctx)}

${formatFacets(ctx.facets)}

${reports.length > 0 ? `RAPPORTS (${reports.length}) :\n${formatTopDocs(reports, 30)}\n` : ''}
${announcements.length > 0 ? `ANNONCES (${announcements.length}) :\n${formatTopDocs(announcements, 30)}\n` : ''}
${publications.length > 0 ? `PUBLICATIONS (${publications.length}) :\n${formatTopDocs(publications, 20)}\n` : ''}

TÂCHE : Rédige le digest mensuel au format demandé.`

  return { system, prompt }
}
