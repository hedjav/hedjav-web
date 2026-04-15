/**
 * Scraper indices BRVM.
 * Source : https://www.brvm.org/fr/indices
 *
 * Extrait BRVM-C (Composite), BRVM-30, BRVM-PRES (Prestige) et tout autre
 * indice présent. Stocke dans brvm_indices_ticks.
 */

import * as cheerio from 'cheerio'
import { upsertIndexTick } from '../../market'
import { extractSeanceDate, fetchMarcheFirst, parseBrvmNumber, today } from './_helpers'

const CANDIDATE_URLS = [
  'https://www.brvm.org/fr/indices',
  'https://www.brvm.org/fr/indices.html',
]

/** Code canonique (BRVM-C, BRVM-30, BRVM-PRES, etc.). */
function normalizeIndexCode(raw: string): string | null {
  const s = raw.trim().toUpperCase()
  if (!s) return null
  if (/BRVM.?C(OMPOSITE)?/.test(s)) return 'BRVM-C'
  if (/BRVM.?30/.test(s)) return 'BRVM-30'
  if (/BRVM.?PRES(TIGE)?/.test(s)) return 'BRVM-PRES'
  // Indices sectoriels (industrie, finance, etc.)
  const secM = s.match(/BRVM.?([A-Z]{3,})/)
  if (secM) return `BRVM-${secM[1]}`
  return null
}

type IndexRow = {
  code: string
  value: number
  variation_pct: number | null
  ytd_pct: number | null
  raw: string[]
}

export function parseIndicesHtml(html: string): { tick_date: string; rows: IndexRow[] } {
  const $ = cheerio.load(html)

  let tickDate: string | null = null
  $('h1, h2, h3, .field-content, .page-title, p').each((_, el) => {
    if (tickDate) return
    const d = extractSeanceDate($(el).text())
    if (d) tickDate = d
  })
  if (!tickDate) tickDate = today()

  const rows: IndexRow[] = []
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td, th').map((__, c) => $(c).text().trim()).get()
    if (cells.length < 2) return

    const code = normalizeIndexCode(cells[0] || '')
    if (!code) return

    const nums = cells.slice(1).map((c) => parseBrvmNumber(c))
    const value = nums.find((n) => n !== null && n > 10) // une valeur d'indice >10 (vs %)
    if (value == null) return

    // Heuristique : variation_pct souvent entre -20 et +20, ytd peut être plus grand
    const pcts = nums.filter((n): n is number => n !== null && Math.abs(n) < 100)
    const variation = pcts.find((n) => Math.abs(n) < 20) ?? null
    const ytd = pcts.reverse().find((n) => n !== variation) ?? null

    rows.push({
      code,
      value,
      variation_pct: variation,
      ytd_pct: ytd,
      raw: cells,
    })
  })

  return { tick_date: tickDate, rows }
}

export async function scrapeIndices(): Promise<{
  ok: boolean
  source: string
  tick_date?: string
  inserted: number
  errors: number
  error_messages: string[]
}> {
  const fetched = await fetchMarcheFirst(CANDIDATE_URLS)
  if (!fetched.ok || !fetched.html) {
    return {
      ok: false,
      source: fetched.url,
      inserted: 0,
      errors: 1,
      error_messages: [fetched.error ?? 'fetch failed'],
    }
  }
  const parsed = parseIndicesHtml(fetched.html)

  let inserted = 0
  let errors = 0
  const errorMessages: string[] = []

  for (const row of parsed.rows) {
    const res = await upsertIndexTick({
      index_code: row.code,
      tick_date: parsed.tick_date,
      value: row.value,
      variation_pct: row.variation_pct,
      ytd_pct: row.ytd_pct,
      raw: { cells: row.raw },
    })
    if (res.ok) inserted++
    else {
      errors++
      if (errorMessages.length < 5 && res.error) errorMessages.push(`${row.code}: ${res.error}`)
    }
  }

  return {
    ok: true,
    source: fetched.url,
    tick_date: parsed.tick_date,
    inserted,
    errors,
    error_messages: errorMessages,
  }
}
