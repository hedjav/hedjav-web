/**
 * Use case P5 — Scoring / qualification d'un document.
 *
 * Qualifie un document BRVM en 4 niveaux (bruit / utile / important /
 * prioritaire) avec justification courte. Utilisé pour filtrer les flux
 * massifs et mettre en avant ce qui compte vraiment dans l'UI admin.
 *
 * Sortie : JSON strict { importance, rationale, tags, score_100 }.
 */

import type { EnrichedDocument, ImportanceLevel } from '../types'
import { formatDocLine } from '../context'
import { composeSystem } from './_system'

export function buildScoringPrompt(doc: EnrichedDocument): {
  system: string
  prompt: string
} {
  const system = composeSystem(`
Tu qualifies l'importance d'une publication BRVM pour l'administrateur éditorial de Hedjav.

Barème :
- **noise** : sans valeur pour Hedjav (doublon, obscur, mineur).
- **useful** : potentiellement intéressant si on creuse, mais pas urgent.
- **important** : mérite une lecture admin dans la journée.
- **priority** : mérite une note de synthèse ou un article éditorial.

Critères :
- Type de document (rapport annuel, convocation AG, BOC, etc.)
- Taille de l'émetteur (blue chip vs small cap)
- Secteur (les télécoms / banques UEMOA pèsent plus qu'un small cap industriel)
- Indice (BRVM-30 et BRVM-PRES > BRVM-C seul)
- Fréquence attendue (rapport annuel = rare = important, communiqué trimestriel = moins)

Sortie : **JSON strict**, pas de prose en dehors. Schéma :

{
  "importance": "noise" | "useful" | "important" | "priority",
  "score_100": 0-100,
  "rationale": "1 phrase factuelle (max 25 mots) qui justifie le niveau",
  "tags": ["tag1", "tag2", "tag3"],
  "editorial_hook": "1 phrase qui suggère un angle éditorial si le doc est utile/important/priority, sinon chaîne vide"
}
`)

  const emetteurBlock = doc.emetteur
    ? `Émetteur : ${doc.emetteur.name} (ticker ${doc.emetteur.ticker ?? '—'}, secteur ${doc.emetteur.sector ?? '—'}, indices ${(doc.emetteur.indices ?? []).join(',') || '—'})`
    : `Émetteur : ${doc.issuer_name ?? doc.issuer_slug ?? '—'} (pas rattaché au référentiel)`

  const prompt = `DOCUMENT À QUALIFIER :

${formatDocLine(doc)}

${emetteurBlock}

Famille : ${doc.doc_family ?? '?'}
Sous-type : ${doc.doc_subtype ?? doc.doc_type ?? '?'}
Date publication : ${doc.doc_date ?? 'inconnue'}
Description : ${doc.description ?? '(aucune)'}

TÂCHE : Produis le JSON de qualification.`

  return { system, prompt }
}

export type ScoringResult = {
  importance: ImportanceLevel
  score_100: number
  rationale: string
  tags: string[]
  editorial_hook: string
}

export function parseScoringResult(raw: string): ScoringResult | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as {
      importance?: unknown
      score_100?: unknown
      rationale?: unknown
      tags?: unknown
      editorial_hook?: unknown
    }
    const imp = parsed.importance
    if (typeof imp !== 'string' || !['noise', 'useful', 'important', 'priority'].includes(imp)) {
      return null
    }
    const score = typeof parsed.score_100 === 'number' ? parsed.score_100 : 0
    return {
      importance: imp as ImportanceLevel,
      score_100: Math.max(0, Math.min(100, Math.round(score))),
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags.filter((t): t is string => typeof t === 'string') as string[])
        : [],
      editorial_hook:
        typeof parsed.editorial_hook === 'string' ? parsed.editorial_hook : '',
    }
  } catch {
    return null
  }
}

/**
 * Scoring heuristique de secours quand l'IA n'est pas disponible.
 * Basé sur family+subtype+indices+secteur (règles simples).
 */
export function heuristicScoring(doc: EnrichedDocument): ScoringResult {
  const family = doc.doc_family
  const subtype = doc.doc_subtype ?? doc.doc_type ?? ''
  const indices = doc.emetteur?.indices ?? []
  const sector = doc.emetteur?.sector

  let score = 30
  if (family === 'report') score += 20
  if (subtype === 'rapport_annuel') score += 20
  if (subtype === 'notation_financiere') score += 15
  if (subtype === 'convocation_ag') score += 10
  if (subtype === 'franchissement_seuil') score += 10
  if (subtype === 'changement_dirigeant') score += 15
  if (subtype === 'boc') score += 5
  if (subtype === 'bulletin_mensuel') score += 10
  if (subtype === 'annee_boursiere') score += 20

  if (indices.includes('BRVM-30')) score += 10
  if (indices.includes('BRVM-PRES')) score += 10

  if (sector === 'Télécommunications' || sector === 'Finance' || sector === 'Énergie') score += 8

  score = Math.max(0, Math.min(100, score))
  let importance: ImportanceLevel
  if (score >= 70) importance = 'priority'
  else if (score >= 50) importance = 'important'
  else if (score >= 30) importance = 'useful'
  else importance = 'noise'

  return {
    importance,
    score_100: score,
    rationale: `Heuristique : famille=${family ?? '?'} · subtype=${subtype} · indices=${indices.join(',') || '—'}`,
    tags: [family, subtype, ...indices].filter((x): x is string => Boolean(x)),
    editorial_hook: '',
  }
}
