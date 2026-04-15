/**
 * Scraper "Résumé de séance" BRVM.
 *
 * Source : https://www.brvm.org/fr/resume
 *
 * Extrait : date de séance, valeur des transactions, capi actions/obligations,
 * nb titres échangés, nb transactions. Tout ce qui n'est pas parsable part
 * dans `raw` JSON pour retraitement ultérieur.
 */

import * as cheerio from 'cheerio'
import { upsertSnapshot } from '../../market'
import { getSourceBySlug } from '../../sources'
import { extractSeanceDate, fetchMarcheFirst, parseBrvmNumber, today } from './_helpers'

const CANDIDATE_URLS = [
  'https://www.brvm.org/fr/resume',
  'https://www.brvm.org/fr/resume.html',
]

type ResumeParsed = {
  snapshot_date: string
  valeur_transactions_fcfa: number | null
  capi_actions_fcfa: number | null
  capi_obligations_fcfa: number | null
  nb_titres_echanges: number | null
  nb_transactions: number | null
  raw: Record<string, unknown>
}

export function parseResumeHtml(html: string): ResumeParsed | null {
  const $ = cheerio.load(html)

  // 1. Date de séance (dans le h1/h2/h3 ou intro texte)
  let snapshotDate: string | null = null
  $('h1, h2, h3, .field-content, .page-title, p').each((_, el) => {
    if (snapshotDate) return
    const d = extractSeanceDate($(el).text())
    if (d) snapshotDate = d
  })
  if (!snapshotDate) snapshotDate = today()

  // 2. Collecte toutes les paires label/valeur depuis les tables
  const pairs: Record<string, string> = {}
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td, th').map((__, c) => $(c).text().trim()).get()
    if (cells.length >= 2) {
      const label = cells[0].toLowerCase()
      const value = cells[cells.length - 1] // dernière col = valeur
      if (label.length > 2 && value.length > 0) {
        pairs[label] = value
      }
    }
  })

  // 3. Mapping heuristique label → champ
  const findByKeywords = (keywords: string[]): number | null => {
    for (const [label, value] of Object.entries(pairs)) {
      if (keywords.every((kw) => label.includes(kw))) {
        return parseBrvmNumber(value)
      }
    }
    return null
  }

  return {
    snapshot_date: snapshotDate,
    valeur_transactions_fcfa: findByKeywords(['valeur', 'transaction']),
    capi_actions_fcfa: findByKeywords(['capitalisation', 'action']),
    capi_obligations_fcfa: findByKeywords(['capitalisation', 'obligation']),
    nb_titres_echanges:
      findByKeywords(['titres', 'échangés']) ?? findByKeywords(['titres', 'echanges']),
    nb_transactions: findByKeywords(['nombre', 'transaction']),
    raw: pairs,
  }
}

export type ResumeScrapeResult = {
  ok: boolean
  source: string
  parsed?: ResumeParsed
  error?: string
}

export async function scrapeResume(): Promise<ResumeScrapeResult> {
  const fetched = await fetchMarcheFirst(CANDIDATE_URLS)
  if (!fetched.ok || !fetched.html) {
    return { ok: false, source: fetched.url, error: fetched.error ?? 'fetch failed' }
  }
  const parsed = parseResumeHtml(fetched.html)
  if (!parsed) {
    return { ok: false, source: fetched.url, error: 'parse failed' }
  }
  const source = await getSourceBySlug('brvm-org')
  const res = await upsertSnapshot({
    snapshot_date: parsed.snapshot_date,
    source_id: source?.id ?? null,
    valeur_transactions_fcfa: parsed.valeur_transactions_fcfa,
    capi_actions_fcfa: parsed.capi_actions_fcfa,
    capi_obligations_fcfa: parsed.capi_obligations_fcfa,
    nb_titres_echanges: parsed.nb_titres_echanges,
    nb_transactions: parsed.nb_transactions,
    raw: parsed.raw,
  })
  if (!res.ok) {
    return { ok: false, source: fetched.url, parsed, error: res.error }
  }
  return { ok: true, source: fetched.url, parsed }
}
