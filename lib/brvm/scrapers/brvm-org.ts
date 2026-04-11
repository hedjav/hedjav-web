/**
 * Scraper brvm.org — source prioritaire pour la veille documentaire.
 *
 * Sections couvertes :
 *  1. BOC quotidien  → /fr/bulletins-officiels-de-la-cote.html (+ pagination)
 *  2. Rapports société → /fr/rapports-societe-cotes/[emetteur].html
 *  3. Annonces       → /fr/emetteurs/type-annonces/[categorie].html (+ pagination)
 *
 * Patterns URL validés via le miroir HTTrack local (voir audit).
 * BOC pattern : sites/default/files/boc_YYYYMMDD_2.pdf (_2 est un suffixe Drupal).
 */

import * as cheerio from 'cheerio'
import type { DocumentInput } from '../types'

const BASE = 'https://www.brvm.org'
const TIMEOUT = 20_000
const USER_AGENT = 'Hedjav-BRVM-Watch/1.0 (+contact: hedjav@gmail.com)'

/* ── Fetch helpers ─────────────────────────────────────────────── */

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.warn(`[brvm-org] HTTP ${res.status} ${url}`)
      return null
    }
    return await res.text()
  } catch (e) {
    console.warn(`[brvm-org] fetch fail ${url}:`, e instanceof Error ? e.message : e)
    return null
  }
}

/* ── Helpers ────────────────────────────────────────────────────── */

function absUrl(href: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${BASE}${href}`
  return `${BASE}/${href}`
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Extrait une date YYYY-MM-DD depuis un nom de fichier BOC type `boc_20260410_2.pdf`.
 */
function extractBocDate(pdfUrl: string): string | null {
  const m = pdfUrl.match(/boc_(\d{4})(\d{2})(\d{2})/i)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * Extrait une date depuis un nom de fichier rapport type `20251205_-_fs_-_emetteur_-_exercice_2025.pdf`.
 */
function extractReportDate(pdfUrl: string): string | null {
  const m = pdfUrl.match(/\/(\d{4})(\d{2})(\d{2})_/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * Slug émetteur depuis un nom de fichier : 'boa-ci', 'air-liquide-ci', etc.
 * Heuristique : on extrait la partie entre "_fs_-_" et "_-_exercice".
 */
function extractIssuerSlug(pdfUrl: string): string | null {
  const m = pdfUrl.match(/_fs_-_([a-z0-9_]+?)_-_(exercice|rapport|arr|etats)/i)
  if (m) return m[1].replace(/_/g, '-')
  return null
}

/* ── 1. BOC ─────────────────────────────────────────────────────── */

/**
 * Scrape la page officielle qui liste les BOC.
 * Retourne tous les BOC trouvés sur la page courante (+ pages suivantes si paginées).
 *
 * Stratégie :
 *  - GET /fr/bulletins-officiels-de-la-cote.html
 *  - Parse tous les <a href> vers `sites/default/files/boc_*.pdf`
 *  - Pour chaque PDF : extraire la date depuis le nom de fichier
 *  - Titre : "BOC du YYYY-MM-DD" (standardisé)
 */
export async function scrapeBocListing(maxPages = 3): Promise<DocumentInput[]> {
  const results: DocumentInput[] = []
  const seen = new Set<string>()

  for (let page = 0; page < maxPages; page++) {
    const url =
      page === 0
        ? `${BASE}/fr/bulletins-officiels-de-la-cote.html`
        : `${BASE}/fr/bulletins-officiels-de-la-cote.html?page=${page}`

    const html = await fetchHtml(url)
    if (!html) break

    const $ = cheerio.load(html)
    let foundOnPage = 0

    $('a[href*="boc_"][href$=".pdf"], a[href*="/boc_"]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (!href) return
      const pdfUrl = absUrl(href)
      if (seen.has(pdfUrl)) return
      seen.add(pdfUrl)

      const docDate = extractBocDate(pdfUrl)
      const title = docDate ? `BOC du ${docDate}` : cleanText($(el).text()) || 'BOC BRVM'

      results.push({
        source_slug: 'brvm-org',
        doc_type: 'boc',
        title,
        doc_date: docDate,
        source_url: url,
        pdf_url: pdfUrl,
        metadata: { scraper: 'brvm-org/boc-listing', page },
      })
      foundOnPage++
    })

    // Si la page ne contient plus de nouveaux liens, stopper
    if (foundOnPage === 0) break
  }

  console.log(`[brvm-org] scrapeBocListing: ${results.length} BOC trouvés`)
  return results
}

/* ── 2. Rapports sociétés cotées ────────────────────────────────── */

/**
 * Entrée : /fr/emetteurs/societes-cotees (listing des sociétés)
 * Pour chaque société, suivre /fr/rapports-societe-cotes/[slug].html
 * et extraire les liens PDF.
 *
 * v1 : on scrape juste l'index et on extrait les liens PDF directement présents,
 * sans parcourir chaque page émetteur (coût réseau). L'import historique via
 * scripts/import-brvm-history.ts se chargera de l'exhaustivité depuis le miroir.
 */
export async function scrapeRapportsIndex(): Promise<DocumentInput[]> {
  const url = `${BASE}/fr/emetteurs/societes-cotees`
  const html = await fetchHtml(url)
  if (!html) return []

  const $ = cheerio.load(html)
  const results: DocumentInput[] = []
  const seen = new Set<string>()

  $('a[href$=".pdf"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const pdfUrl = absUrl(href)
    if (!pdfUrl || seen.has(pdfUrl)) return
    seen.add(pdfUrl)

    const title = cleanText($(el).text()) || pdfUrl.split('/').pop() || 'Rapport'
    const docDate = extractReportDate(pdfUrl)
    const issuerSlug = extractIssuerSlug(pdfUrl)

    // Heuristique type : "rapport annuel" si "exercice" dans l'URL, sinon trimestriel
    const lower = pdfUrl.toLowerCase()
    const docType: DocumentInput['doc_type'] =
      lower.includes('exercice') || lower.includes('annuel')
        ? 'rapport_annuel'
        : lower.includes('semestr')
          ? 'rapport_semestriel'
          : lower.includes('trimestr')
            ? 'rapport_trimestriel'
            : 'rapport_annuel'

    results.push({
      source_slug: 'brvm-org',
      doc_type: docType,
      title,
      doc_date: docDate,
      source_url: url,
      pdf_url: pdfUrl,
      issuer_slug: issuerSlug,
      metadata: { scraper: 'brvm-org/rapports-index' },
    })
  })

  console.log(`[brvm-org] scrapeRapportsIndex: ${results.length} rapports`)
  return results
}

/* ── 3. Annonces par catégorie ──────────────────────────────────── */

/** Catégories d'annonces publiées par la BRVM (validées via le miroir HTTrack). */
export const ANNONCE_CATEGORIES = [
  'communiques',
  'changements-de-dirigeants',
  'franchissements-de-seuil',
  'assemblees-generales',
  'augmentation-capital',
  'distribution-dividendes',
  'notes-information',
  'operations-financieres',
] as const

export type AnnonceCategorie = (typeof ANNONCE_CATEGORIES)[number]

/**
 * Scrape une catégorie d'annonces brvm.org avec pagination.
 */
export async function scrapeAnnonceCategorie(
  categorie: AnnonceCategorie,
  maxPages = 2
): Promise<DocumentInput[]> {
  const results: DocumentInput[] = []
  const seen = new Set<string>()

  // Mapping catégorie → doc_type
  const docType: DocumentInput['doc_type'] =
    categorie === 'communiques'
      ? 'communique'
      : categorie === 'notes-information'
        ? 'note_information'
        : 'annonce'

  for (let page = 0; page < maxPages; page++) {
    const url =
      page === 0
        ? `${BASE}/fr/emetteurs/type-annonces/${categorie}.html`
        : `${BASE}/fr/emetteurs/type-annonces/${categorie}.html?page=${page}`

    const html = await fetchHtml(url)
    if (!html) break

    const $ = cheerio.load(html)
    let foundOnPage = 0

    // Drupal Views : chaque annonce est typiquement dans un .views-row ou <tr>
    $('.views-row, table tbody tr, article').each((_, el) => {
      const title = cleanText(
        $(el).find('h2, h3, .field--name-title, a').first().text()
      )
      if (!title || title.length < 5) return

      const dateText = cleanText(
        $(el).find('.field--name-field-date, time, .date').first().text()
      )
      const docDate = parseDateText(dateText)

      const pdfLink = $(el).find('a[href*=".pdf"]').attr('href')
      const pdfUrl = pdfLink ? absUrl(pdfLink) : null

      // Clé dédup locale : titre + date (pour éviter doublons sur la même page)
      const localKey = `${title}|${dateText}`
      if (seen.has(localKey)) return
      seen.add(localKey)

      results.push({
        source_slug: 'brvm-org',
        doc_type: docType,
        title,
        doc_date: docDate,
        source_url: url,
        pdf_url: pdfUrl,
        metadata: { scraper: 'brvm-org/annonces', categorie, page },
      })
      foundOnPage++
    })

    if (foundOnPage === 0) break
  }

  console.log(`[brvm-org] scrapeAnnonceCategorie(${categorie}): ${results.length}`)
  return results
}

/**
 * Parse une date texte FR/ISO vers YYYY-MM-DD.
 * Supporte : "10/04/2026", "10-04-2026", "2026-04-10", "10 avril 2026".
 */
function parseDateText(text: string): string | null {
  if (!text) return null
  const cleaned = text.trim()

  // ISO
  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // FR: 10/04/2026 ou 10-04-2026
  const fr = cleaned.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (fr) {
    const d = fr[1].padStart(2, '0')
    const m = fr[2].padStart(2, '0')
    return `${fr[3]}-${m}-${d}`
  }

  // FR littéral: "10 avril 2026"
  const mois: Record<string, string> = {
    janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
    mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
    septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
  }
  const litt = cleaned.toLowerCase().match(/(\d{1,2})\s+([a-zéèûôâ]+)\s+(\d{4})/)
  if (litt && mois[litt[2]]) {
    return `${litt[3]}-${mois[litt[2]]}-${litt[1].padStart(2, '0')}`
  }

  return null
}

/**
 * Helper : scrape toutes les catégories d'annonces.
 */
export async function scrapeAllAnnonces(): Promise<DocumentInput[]> {
  const all: DocumentInput[] = []
  for (const cat of ANNONCE_CATEGORIES) {
    const docs = await scrapeAnnonceCategorie(cat, 1)
    all.push(...docs)
  }
  return all
}
