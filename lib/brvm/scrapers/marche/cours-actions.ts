/**
 * Scraper cours actions BRVM.
 * Source : https://www.brvm.org/fr/cours-actions/0
 *
 * Parse la table des cotations actions et upsert dans brvm_market_ticks.
 * Rattachement émetteur : via ticker ou nom (aliases).
 */

import * as cheerio from 'cheerio'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { upsertTick } from '../../market'
import { extractSeanceDate, fetchMarcheFirst, parseBrvmNumber, today } from './_helpers'
import type { BrvmEmetteur } from '../../types'

const CANDIDATE_URLS = [
  'https://www.brvm.org/fr/cours-actions/0',
  'https://www.brvm.org/fr/cours-actions',
  'https://www.brvm.org/fr/cours-actions/0.html',
]

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type EmetteurIndex = {
  byTicker: Map<string, string>
  byName: Map<string, string>
  byAlias: Map<string, string>
}

async function buildEmetteurIndex(): Promise<EmetteurIndex> {
  const db = adminClient()
  const { data } = await db
    .from('brvm_emetteurs')
    .select('id, slug, ticker, name, aliases')
    .eq('is_active', true)
    .eq('market', 'actions')

  const byTicker = new Map<string, string>()
  const byName = new Map<string, string>()
  const byAlias = new Map<string, string>()
  for (const e of (data as Array<Pick<BrvmEmetteur, 'id' | 'slug' | 'ticker' | 'name' | 'aliases'>>) ?? []) {
    if (e.ticker) byTicker.set(e.ticker.toUpperCase(), e.slug)
    byName.set(e.name.toLowerCase(), e.slug)
    for (const a of e.aliases ?? []) byAlias.set(a.toLowerCase(), e.slug)
  }
  return { byTicker, byName, byAlias }
}

function resolveSlugFromRow(
  cells: string[],
  idx: EmetteurIndex
): string | null {
  // Heuristique : 1er ou 2e col souvent ticker/nom
  const candidates = cells.slice(0, 3).map((c) => c.trim()).filter(Boolean)
  for (const c of candidates) {
    const upper = c.toUpperCase()
    if (idx.byTicker.has(upper)) return idx.byTicker.get(upper)!
    const lower = c.toLowerCase()
    if (idx.byName.has(lower)) return idx.byName.get(lower)!
    if (idx.byAlias.has(lower)) return idx.byAlias.get(lower)!
  }
  return null
}

type CoursRow = {
  slug: string
  raw: string[]
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  previous_close: number | null
  variation_pct: number | null
  volume: number | null
  value_fcfa: number | null
}

export function parseCoursActionsHtml(
  html: string,
  idx: EmetteurIndex
): { tick_date: string; rows: CoursRow[] } {
  const $ = cheerio.load(html)

  let tickDate: string | null = null
  $('h1, h2, h3, .field-content, .page-title').each((_, el) => {
    if (tickDate) return
    const d = extractSeanceDate($(el).text())
    if (d) tickDate = d
  })
  if (!tickDate) tickDate = today()

  const rows: CoursRow[] = []
  $('table').each((_, table) => {
    const trs = $(table).find('tr')
    if (trs.length < 3) return

    trs.each((ri, tr) => {
      if (ri === 0) return // skip header
      const cells = $(tr).find('td').map((__, c) => $(c).text().trim()).get()
      if (cells.length < 3) return

      const slug = resolveSlugFromRow(cells, idx)
      if (!slug) return

      // Heuristique colonnes BRVM : Symbole | Société | Ouverture | Haut | Bas | Cours | Préc | Var% | Volume | Valeur
      // On prend les nombres détectables dans les colonnes 2..end
      const nums = cells.map((c) => parseBrvmNumber(c))
      // Indice du 1er nombre valide après les 2 premières colonnes texte
      const firstNumIdx = Math.max(2, nums.findIndex((n, i) => i >= 2 && n !== null))
      const slice = nums.slice(firstNumIdx)

      rows.push({
        slug,
        raw: cells,
        open: slice[0] ?? null,
        high: slice[1] ?? null,
        low: slice[2] ?? null,
        close: slice[3] ?? null,
        previous_close: slice[4] ?? null,
        variation_pct: slice[5] ?? null,
        volume: slice[6] ?? null,
        value_fcfa: slice[7] ?? null,
      })
    })
  })

  return { tick_date: tickDate, rows }
}

export type CoursActionsScrapeResult = {
  ok: boolean
  source: string
  tick_date?: string
  inserted: number
  errors: number
  error_messages: string[]
}

export async function scrapeCoursActions(): Promise<CoursActionsScrapeResult> {
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
  const idx = await buildEmetteurIndex()
  const parsed = parseCoursActionsHtml(fetched.html, idx)

  let inserted = 0
  let errors = 0
  const errorMessages: string[] = []

  for (const row of parsed.rows) {
    const res = await upsertTick({
      emetteur_slug: row.slug,
      tick_date: parsed.tick_date,
      market: 'actions',
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      previous_close: row.previous_close,
      variation_pct: row.variation_pct,
      volume: row.volume,
      value_fcfa: row.value_fcfa,
      raw: { cells: row.raw },
    })
    if (res.ok) inserted++
    else {
      errors++
      if (errorMessages.length < 5 && res.error) errorMessages.push(`${row.slug}: ${res.error}`)
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
