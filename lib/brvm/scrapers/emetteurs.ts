/**
 * Scraper de la liste des sociétés cotées BRVM.
 *
 * Source primaire : https://www.brvm.org/fr/emetteurs/societes-cotees
 * Fallback : liste hardcodée `EMETTEURS_SEED` dans lib/brvm/emetteurs-seed.ts.
 *
 * Stratégie :
 *   1. Tente de fetcher la page brvm.org (3 URLs candidats)
 *   2. Parse les liens vers /fr/rapports-societe-cotes/{slug}(.html)?
 *   3. Upsert chaque émetteur (merge souple avec existant)
 *   4. En fallback total, applique EMETTEURS_SEED
 *
 * Idempotent : relancer = merge, pas de doublon (slug unique).
 */

import * as cheerio from 'cheerio'
import { BRVM_FETCH_TIMEOUT, brvmFetchOptions, extractFetchError } from '../http'
import { upsertEmetteur } from '../emetteurs'
import { EMETTEURS_SEED } from '../emetteurs-seed'
import type { EmetteurInput } from '../types'

const BASE = 'https://www.brvm.org'
const CANDIDATE_URLS = [
  `${BASE}/fr/emetteurs/societes-cotees`,
  `${BASE}/fr/emetteurs/societes-cotees.html`,
  `${BASE}/fr/rapports-societe-cotes`,
]

type FetchResult = { html: string | null; ok: boolean; url: string; error?: string }

async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), BRVM_FETCH_TIMEOUT)
    const res = await fetch(url, brvmFetchOptions(url, { signal: ctrl.signal }))
    clearTimeout(timer)
    if (!res.ok) return { html: null, ok: false, url, error: `HTTP ${res.status}` }
    const html = await res.text()
    if (html.includes('Page non trouvée') || html.includes('Page not found')) {
      return { html, ok: false, url, error: '404 déguisé' }
    }
    return { html, ok: true, url }
  } catch (e) {
    return { html: null, ok: false, url, error: extractFetchError(e) }
  }
}

async function fetchFirstOk(urls: string[]): Promise<FetchResult> {
  let last: FetchResult = { html: null, ok: false, url: urls[0], error: 'no candidate' }
  for (const u of urls) {
    const r = await fetchPage(u)
    if (r.ok) return r
    last = r
    console.warn(`[brvm/emetteurs] fallback ${u}: ${r.error}`)
  }
  return last
}

/** Extrait le slug canonique depuis un href `/fr/rapports-societe-cotes/{slug}(.html)?` */
function extractSlugFromHref(href: string): string | null {
  const m = href.match(/\/fr\/rapports-societe-cotes\/([^/.?#]+)(?:\.html)?/i)
  if (!m) return null
  return m[1].toLowerCase()
}

/** Parse la page HTML de brvm.org et extrait les liens émetteur → {slug, name, url}. */
export function parseEmetteursHtml(html: string): EmetteurInput[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const found: EmetteurInput[] = []

  $('a[href*="/fr/rapports-societe-cotes/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const name = $(el).text().trim()
    const slug = extractSlugFromHref(href)
    if (!slug || seen.has(slug)) return
    if (!name || name.length < 2) return
    seen.add(slug)

    found.push({
      slug,
      name,
      source_url: href.startsWith('http') ? href : `${BASE}${href}`,
      aliases: [name],
      is_active: true,
    })
  })

  return found
}

export type EmetteursScrapeResult = {
  source: 'brvm-org' | 'seed-fallback'
  fetched_url?: string
  discovered_remote: number
  inserted: number
  updated: number
  errors: number
  error_messages: string[]
  duration_ms: number
}

/**
 * Lance le scraping complet : tente brvm.org, fallback sur seed hardcodé,
 * upserte chaque émetteur.
 */
export async function scrapeEmetteurs(
  options: { dryRun?: boolean } = {}
): Promise<EmetteursScrapeResult> {
  const started = Date.now()
  const errors: string[] = []
  let inserted = 0
  let updated = 0

  // 1. Tentative brvm.org
  const fetched = await fetchFirstOk(CANDIDATE_URLS)
  let remoteList: EmetteurInput[] = []
  let source: 'brvm-org' | 'seed-fallback' = 'seed-fallback'
  let fetchedUrl: string | undefined

  if (fetched.ok && fetched.html) {
    remoteList = parseEmetteursHtml(fetched.html)
    if (remoteList.length > 0) {
      source = 'brvm-org'
      fetchedUrl = fetched.url
    }
  } else {
    errors.push(`Fetch brvm.org: ${fetched.error}`)
  }

  // 2. Merge avec seed hardcodé (seed = source de métadata complémentaire)
  const seedBySlug = new Map(EMETTEURS_SEED.map((e) => [e.slug, e] as const))
  const finalList = new Map<string, EmetteurInput>()

  // Commence par seed (valeurs par défaut riches)
  for (const e of EMETTEURS_SEED) finalList.set(e.slug, { ...e })

  // Enrichit avec brvm.org (nom officiel, source_url)
  for (const r of remoteList) {
    const existing = finalList.get(r.slug)
    if (existing) {
      finalList.set(r.slug, {
        ...existing,
        source_url: r.source_url ?? existing.source_url,
        aliases: Array.from(new Set([...(existing.aliases ?? []), ...(r.aliases ?? [])])),
      })
    } else {
      // Nouvelle société pas dans seed : on l'ajoute avec ce qu'on a
      finalList.set(r.slug, { ...r, market: 'actions' })
    }
  }

  // 3. Upsert chaque émetteur
  if (!options.dryRun) {
    for (const input of finalList.values()) {
      const res = await upsertEmetteur(input)
      if (res.status === 'inserted') inserted++
      else if (res.status === 'updated') updated++
      else {
        errors.push(`${input.slug}: ${res.error ?? 'unknown'}`)
      }
    }
  }

  // Rappelle seed count même en dry-run
  if (options.dryRun) {
    inserted = seedBySlug.size // approximation dry-run
  }

  return {
    source,
    fetched_url: fetchedUrl,
    discovered_remote: remoteList.length,
    inserted,
    updated,
    errors: errors.length,
    error_messages: errors.slice(0, 10),
    duration_ms: Date.now() - started,
  }
}
