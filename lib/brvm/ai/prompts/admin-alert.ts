/**
 * Use case P1 — Alerte admin enrichie.
 *
 * Déclenchée quand on veut un résumé "frais" de ce qui vient d'arriver sur
 * la BRVM, avec mise en avant des éléments importants, des sociétés, secteurs
 * et indices concernés.
 */

import type { BrvmAiContext } from '../types'
import { formatFacets, formatMarketSnippet, formatTopDocs } from '../context'
import { composeSystem } from './_system'

export function buildAdminAlertPrompt(ctx: BrvmAiContext): {
  system: string
  prompt: string
} {
  const families = Object.entries(ctx.docs).map(
    ([k, arr]) => `${k} (${arr?.length ?? 0})`
  )

  const reports = ctx.docs.report ?? []
  const announcements = ctx.docs.announcement ?? []
  const publications = ctx.docs.publication ?? []

  const allDocs = [...reports, ...announcements, ...publications].sort((a, b) => {
    const da = (a.doc_date ?? a.discovered_at).localeCompare(b.doc_date ?? b.discovered_at)
    return -da
  })

  const system = composeSystem(`
Tu rédiges une **alerte admin enrichie** pour l'administrateur de egp.hedjav.com qui vient d'ouvrir son tableau de bord BRVM. Format attendu :
- 3 à 5 puces courtes (max 20 mots chacune)
- Pour chaque puce : société concernée (si pertinent), pourquoi ça mérite son attention, quel univers / catégorie
- Ne liste pas tout : prioritise ce qui est actionnable, éditorialisable ou structurel
- Si un même événement touche plusieurs sociétés (ex: changement réglementaire), le consolider en une puce
`)

  const prompt = `CONTEXTE — Période ${ctx.period.label.toLowerCase()} (${ctx.total_docs} documents, familles : ${families.join(', ')})

${formatMarketSnippet(ctx)}

${formatFacets(ctx.facets)}

DOCUMENTS LES PLUS RÉCENTS (max 30) :
${formatTopDocs(allDocs, 30)}

TÂCHE :
Produis une alerte admin enrichie au format demandé. Démarre directement par les puces. Pas d'intro.`

  return { system, prompt }
}
