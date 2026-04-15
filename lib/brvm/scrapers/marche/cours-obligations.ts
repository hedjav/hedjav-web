/**
 * Scraper cours obligations BRVM.
 * Source : https://www.brvm.org/fr/cours-obligations/0
 *
 * Même logique que cours-actions mais pour les obligations.
 * Les obligations ont souvent un "nominal" et un "taux" au lieu de haut/bas.
 * On stocke en "best effort" + `raw`.
 */

import * as cheerio from 'cheerio'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { upsertTick } from '../../market'
import { extractSeanceDate, fetchMarcheFirst, parseBrvmNumber, today } from './_helpers'

const CANDIDATE_URLS = [
  'https://www.brvm.org/fr/cours-obligations/0',
  'https://www.brvm.org/fr/cours-obligations',
  'https://www.brvm.org/fr/cours-obligations/0.html',
]

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type ObligRow = {
  slug: string
  raw: string[]
  close: number | null
  previous_close: number | null
  variation_pct: number | null
  volume: number | null
  value_fcfa: number | null
}

/**
 * Pour obligations : pas de seed hardcodé aussi riche que pour actions. On essaie
 * de résoudre par nom ou par code ISIN, sinon on crée un émetteur-obligation à
 * la volée (via upsert direct, is_active=true market='obligations').
 */
async function resolveOrCreateObligEmetteur(
  code: string,
  name: string
): Promise<string | null> {
  const db = adminClient()
  const slug = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return null

  const { data: existing } = await db
    .from('brvm_emetteurs')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return existing.slug

  const { error } = await db.from('brvm_emetteurs').insert({
    slug,
    ticker: code.toUpperCase(),
    name: name || code,
    market: 'obligations',
    is_active: true,
    metadata: { auto_created_from_cours_obligations: true },
  })
  if (error) {
    console.warn(`[cours-obligations] impossible de créer émetteur ${slug}:`, error.message)
    return null
  }
  return slug
}

export async function scrapeCoursObligations(): Promise<{
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

  const $ = cheerio.load(fetched.html)
  let tickDate: string | null = null
  $('h1, h2, h3, .field-content, .page-title').each((_, el) => {
    if (tickDate) return
    const d = extractSeanceDate($(el).text())
    if (d) tickDate = d
  })
  if (!tickDate) tickDate = today()

  const rows: ObligRow[] = []
  $('table').each((_, table) => {
    const trs = $(table).find('tr')
    if (trs.length < 3) return
    trs.each((ri, tr) => {
      if (ri === 0) return
      const cells = $(tr).find('td').map((__, c) => $(c).text().trim()).get()
      if (cells.length < 3) return
      rows.push({
        slug: '', // rempli plus bas
        raw: cells,
        close: null,
        previous_close: null,
        variation_pct: null,
        volume: null,
        value_fcfa: null,
      })
    })
  })

  let inserted = 0
  let errors = 0
  const errorMessages: string[] = []

  for (const row of rows) {
    const code = row.raw[0] || ''
    const name = row.raw[1] || ''
    const slug = await resolveOrCreateObligEmetteur(code, name)
    if (!slug) {
      errors++
      continue
    }
    const nums = row.raw.map((c) => parseBrvmNumber(c))
    const firstNumIdx = Math.max(2, nums.findIndex((n, i) => i >= 2 && n !== null))
    const slice = nums.slice(firstNumIdx)

    const res = await upsertTick({
      emetteur_slug: slug,
      tick_date: tickDate,
      market: 'obligations',
      close: slice[0] ?? null,
      previous_close: slice[1] ?? null,
      variation_pct: slice[2] ?? null,
      volume: slice[3] ?? null,
      value_fcfa: slice[4] ?? null,
      raw: { cells: row.raw },
    })
    if (res.ok) inserted++
    else {
      errors++
      if (errorMessages.length < 5 && res.error) errorMessages.push(`${slug}: ${res.error}`)
    }
  }

  return {
    ok: true,
    source: fetched.url,
    tick_date: tickDate,
    inserted,
    errors,
    error_messages: errorMessages,
  }
}
