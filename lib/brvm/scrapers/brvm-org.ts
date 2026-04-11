/**
 * Scraper brvm.org — source prioritaire pour la veille documentaire.
 *
 * ⚠️ URLs actuelles SANS extension .html (Drupal a nettoyé en 2024/2025).
 * L'ancienne version du scraper utilisait des URLs `.html` qui retournaient
 * toutes "Page non trouvée" → 0 résultat. Corrigé.
 *
 * Sections couvertes :
 *  1. BOC quotidien  → /fr/bulletins-officiels-de-la-cote
 *  2. Rapports société → /fr/rapports-societes-cotees (ou par émetteur)
 *  3. Annonces       → /fr/emetteurs/type-annonces/[categorie]
 *
 * Stratégie résiliente :
 *  - Sélecteur permissif `a[href$=".pdf"]` qui capture TOUT lien PDF
 *  - Classification au runtime par nom de fichier (pas par sélecteur DOM)
 *  - Essaie plusieurs URLs candidats si la principale échoue (.html fallback)
 *  - Retourne des stats de diagnostic en plus des documents
 */

import * as cheerio from 'cheerio'
import type { DocumentInput, DocType } from '../types'
import { BRVM_FETCH_TIMEOUT, brvmFetchOptions, extractFetchError } from '../http'

const BASE = 'https://www.brvm.org'
const TIMEOUT = BRVM_FETCH_TIMEOUT

/* ── Fetch helpers ─────────────────────────────────────────────── */

type FetchResult = {
  url: string
  ok: boolean
  status: number | null
  html: string | null
  title: string | null
  error?: string
}

/**
 * Fetch avec diagnostic complet (titre, status, erreur).
 *
 * Utilise `brvmFetchOptions` (lib/brvm/http.ts) qui applique automatiquement
 * l'undici Agent SSL-relâché quand l'URL est sur brvm.org. Sans ça, Node.js
 * rejette le cert chain incomplet de Drupal 7 avec "fetch failed" générique.
 */
async function fetchHtmlDiagnostic(url: string): Promise<FetchResult> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)

    const res = await fetch(url, brvmFetchOptions(url, { signal: ctrl.signal }))
    clearTimeout(timer)

    if (!res.ok) {
      return {
        url,
        ok: false,
        status: res.status,
        html: null,
        title: null,
        error: `HTTP ${res.status} ${res.statusText}`,
      }
    }

    const html = await res.text()
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    // Détecte les pages 404 Drupal qui renvoient un 200 OK trompeur
    if (title && (title.includes('Page non trouvée') || title.includes('Page not found'))) {
      return {
        url,
        ok: false,
        status: 200,
        html,
        title,
        error: `Page 404 déguisée en 200 : "${title}"`,
      }
    }

    return { url, ok: true, status: res.status, html, title }
  } catch (e) {
    return {
      url,
      ok: false,
      status: null,
      html: null,
      title: null,
      error: extractFetchError(e),
    }
  }
}

/**
 * Tente plusieurs URLs candidats dans l'ordre et retourne le premier HTML OK.
 * Utile quand on ne sait pas si BRVM utilise `.html` ou pas.
 */
async function fetchHtmlWithFallback(candidates: string[]): Promise<FetchResult> {
  let lastResult: FetchResult | null = null
  for (const url of candidates) {
    const result = await fetchHtmlDiagnostic(url)
    if (result.ok && result.html) return result
    lastResult = result
    console.warn(
      `[brvm-org] fallback: ${url} → ${result.error ?? `HTTP ${result.status}`}`
    )
  }
  return (
    lastResult ?? {
      url: candidates[0] ?? '',
      ok: false,
      status: null,
      html: null,
      title: null,
      error: 'aucun candidat',
    }
  )
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
 * Extrait une date depuis un nom de fichier type `YYYYMMDD_-_fs_-_...`.
 */
function extractDocDate(pdfUrl: string): string | null {
  const m = pdfUrl.match(/\/(\d{4})(\d{2})(\d{2})[_-]/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * Slug émetteur depuis un nom de fichier.
 */
function extractIssuerSlug(pdfUrl: string): string | null {
  // Pattern fs : 20120302_-_fs_-_vivo_energy_ci_-_exercice_2012.pdf
  const m1 = pdfUrl.match(/_fs_-_([a-z0-9_]+?)_-_(exercice|rapport|arr|etats|comptes)/i)
  if (m1) return m1[1].replace(/_/g, '-')
  // Pattern communique : 20260409_-_communique_de_presse_-_onatel_bf.pdf
  const m2 = pdfUrl.match(/_-_([a-z0-9_]+?)(\.pdf|_\d+\.pdf)/i)
  if (m2) return m2[1].replace(/_/g, '-')
  return null
}

/**
 * Classifie un nom de fichier PDF en DocType en se basant uniquement sur le nom.
 * Permet au scraper de rester "dumb" et robuste : on prend tous les PDFs de
 * la page et on les classifie ici, plutôt que d'avoir des sélecteurs DOM
 * fragiles par catégorie.
 */
export function classifyPdfByName(filename: string): DocType {
  const lower = filename.toLowerCase()
  if (lower.startsWith('boc_') || lower.includes('/boc_')) return 'boc'
  if (lower.includes('_fs_-_') && (lower.includes('exercice') || lower.includes('annuel')))
    return 'rapport_annuel'
  if (lower.includes('semestriel') || lower.includes('_s1_') || lower.includes('_s2_'))
    return 'rapport_semestriel'
  if (lower.includes('trimestriel') || lower.includes('_t1_') || lower.includes('_t2_') || lower.includes('_t3_') || lower.includes('_t4_'))
    return 'rapport_trimestriel'
  if (lower.includes('_fs_-_')) return 'rapport_annuel'
  if (lower.includes('communique')) return 'communique'
  if (lower.includes('note_information') || lower.includes('note_dinformation')) return 'note_information'
  if (lower.includes('avis_ndeg') || lower.includes('/avis_')) return 'avis'
  if (lower.includes('changement') || lower.includes('franchissement') || lower.includes('assemblee') || lower.includes('convocation') || lower.includes('dividende') || lower.includes('capital'))
    return 'annonce'
  return 'autre'
}

/**
 * Parse une date texte FR/ISO vers YYYY-MM-DD.
 */
function parseDateText(text: string): string | null {
  if (!text) return null
  const cleaned = text.trim()

  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const fr = cleaned.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (fr) {
    const d = fr[1].padStart(2, '0')
    const m = fr[2].padStart(2, '0')
    return `${fr[3]}-${m}-${d}`
  }

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
 * Extraction permissive : prend TOUT lien PDF sur une page, élimine les
 * doublons, et retourne un DocumentInput par PDF. La classification est
 * faite par le nom de fichier.
 *
 * Retourne aussi des stats de diagnostic pour qu'on sache si la page était
 * accessible.
 */
type ExtractResult = {
  documents: DocumentInput[]
  diagnostic: {
    url_fetched: string | null
    status: number | null
    title: string | null
    pdf_links_found: number
    error?: string
  }
}

async function extractPdfsFromPage(
  candidates: string[],
  forceDocType?: DocType
): Promise<ExtractResult> {
  const fetched = await fetchHtmlWithFallback(candidates)
  if (!fetched.ok || !fetched.html) {
    return {
      documents: [],
      diagnostic: {
        url_fetched: fetched.url,
        status: fetched.status,
        title: fetched.title,
        pdf_links_found: 0,
        error: fetched.error ?? `HTTP ${fetched.status}`,
      },
    }
  }

  const $ = cheerio.load(fetched.html)
  const seen = new Set<string>()
  const documents: DocumentInput[] = []

  // Sélecteur permissif : tout lien PDF, peu importe le contexte DOM
  $('a[href$=".pdf"], a[href*=".pdf?"], a[href*="/sites/default/files/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href) return
    const pdfUrl = absUrl(href)

    // Filtre : doit vraiment pointer vers un PDF
    if (!pdfUrl.toLowerCase().includes('.pdf')) return
    if (seen.has(pdfUrl)) return
    seen.add(pdfUrl)

    const linkText = cleanText($(el).text())
    const filename = pdfUrl.split('/').pop() ?? ''

    // Classification
    const docType = forceDocType ?? classifyPdfByName(filename)

    // Dates — chain de fallback pour garantir un doc_date non-NULL :
    //   1. Pattern BOC (boc_YYYYMMDD)
    //   2. Pattern générique du nom de fichier (YYYYMMDD_...)
    //   3. Parsing du texte du lien (ex: "10/04/2026" ou "10 avril 2026")
    //   4. Fallback final = date du jour du scraping (traçabilité via date_source)
    const bocDate = extractBocDate(filename)
    const otherDate = extractDocDate(pdfUrl)
    const linkTextDate = parseDateText(linkText)
    const fallbackScrapeDate = new Date().toISOString().slice(0, 10)
    const docDate = bocDate ?? otherDate ?? linkTextDate ?? fallbackScrapeDate
    const dateSource: 'boc_filename' | 'doc_filename' | 'link_text' | 'scrape_fallback' =
      bocDate ? 'boc_filename'
        : otherDate ? 'doc_filename'
          : linkTextDate ? 'link_text'
            : 'scrape_fallback'

    // Titre
    let title: string
    if (docType === 'boc' && docDate) {
      title = `BOC du ${docDate}`
    } else if (linkText && linkText.length > 5) {
      title = linkText
    } else {
      // Reconstruit un titre depuis le nom de fichier
      title = filename
        .replace(/\.pdf$/i, '')
        .replace(/^\d{8}_-_/, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .trim()
        .slice(0, 200)
      if (!title) title = filename
    }

    // Issuer
    const issuerSlug = extractIssuerSlug(pdfUrl)

    documents.push({
      source_slug: 'brvm-org',
      doc_type: docType,
      title,
      doc_date: docDate,
      source_url: fetched.url,
      pdf_url: pdfUrl,
      issuer_slug: issuerSlug,
      metadata: {
        scraper: 'brvm-org/permissive',
        link_text: linkText || undefined,
        date_source: dateSource,
      },
    })
  })

  return {
    documents,
    diagnostic: {
      url_fetched: fetched.url,
      status: fetched.status,
      title: fetched.title,
      pdf_links_found: documents.length,
    },
  }
}

/* ── 1. BOC ─────────────────────────────────────────────────────── */

/**
 * Scrape la page BOC de brvm.org.
 * URL actuelle (2025+) : `/fr/bulletins-officiels-de-la-cote` (sans .html)
 * Fallback : ancienne URL `.html` pour compat.
 */
export async function scrapeBocListing(maxPages = 3): Promise<DocumentInput[]> {
  const allDocs: DocumentInput[] = []
  const seen = new Set<string>()

  for (let page = 0; page < maxPages; page++) {
    const candidates: string[] =
      page === 0
        ? [
            `${BASE}/fr/bulletins-officiels-de-la-cote`,
            `${BASE}/fr/bulletins-officiels-de-la-cote.html`,
            `${BASE}/fr/marche/bulletin-officiel-de-la-cote`,
          ]
        : [
            `${BASE}/fr/bulletins-officiels-de-la-cote?page=${page}`,
            `${BASE}/fr/bulletins-officiels-de-la-cote.html?page=${page}`,
          ]

    const { documents, diagnostic } = await extractPdfsFromPage(candidates, 'boc')
    console.log(
      `[brvm-org] scrapeBocListing page=${page} url=${diagnostic.url_fetched} found=${diagnostic.pdf_links_found}`
    )

    let newOnPage = 0
    for (const doc of documents) {
      if (doc.pdf_url && seen.has(doc.pdf_url)) continue
      if (doc.pdf_url) seen.add(doc.pdf_url)
      allDocs.push(doc)
      newOnPage++
    }
    if (newOnPage === 0) break
  }

  console.log(`[brvm-org] scrapeBocListing total: ${allDocs.length} BOC`)
  return allDocs
}

/* ── 2. Rapports sociétés cotées ────────────────────────────────── */

/**
 * Scrape les rapports depuis la page index.
 * URL actuelle (2025+) : `/fr/rapports-societes-cotees` (avec 's' + sans .html)
 */
export async function scrapeRapportsIndex(): Promise<DocumentInput[]> {
  const candidates = [
    `${BASE}/fr/rapports-societes-cotees`,
    `${BASE}/fr/rapports-societe-cotes`,
    `${BASE}/fr/rapports-societe-cotes.html`,
  ]
  const { documents, diagnostic } = await extractPdfsFromPage(candidates)
  console.log(
    `[brvm-org] scrapeRapportsIndex url=${diagnostic.url_fetched} found=${diagnostic.pdf_links_found}`
  )
  return documents
}

/* ── 3. Annonces par catégorie ──────────────────────────────────── */

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
 * Scrape une catégorie d'annonces avec pagination.
 */
export async function scrapeAnnonceCategorie(
  categorie: AnnonceCategorie,
  maxPages = 2
): Promise<DocumentInput[]> {
  const allDocs: DocumentInput[] = []
  const seen = new Set<string>()

  // Le doc_type est déterminé par la catégorie de la page MAIS si le scraper
  // classifie différemment via le nom de fichier, on lui fait confiance.
  const fallbackType: DocType =
    categorie === 'communiques'
      ? 'communique'
      : categorie === 'notes-information'
        ? 'note_information'
        : 'annonce'

  for (let page = 0; page < maxPages; page++) {
    const candidates: string[] =
      page === 0
        ? [
            `${BASE}/fr/emetteurs/type-annonces/${categorie}`,
            `${BASE}/fr/emetteurs/type-annonces/${categorie}.html`,
          ]
        : [
            `${BASE}/fr/emetteurs/type-annonces/${categorie}?page=${page}`,
            `${BASE}/fr/emetteurs/type-annonces/${categorie}.html?page=${page}`,
          ]

    const { documents, diagnostic } = await extractPdfsFromPage(candidates)
    console.log(
      `[brvm-org] scrapeAnnonceCategorie cat=${categorie} page=${page} url=${diagnostic.url_fetched} found=${diagnostic.pdf_links_found}`
    )

    let newOnPage = 0
    for (const doc of documents) {
      if (doc.pdf_url && seen.has(doc.pdf_url)) continue
      if (doc.pdf_url) seen.add(doc.pdf_url)
      // Si la classification auto donne 'autre', on force le fallbackType
      if (doc.doc_type === 'autre') doc.doc_type = fallbackType
      allDocs.push(doc)
      newOnPage++
    }
    if (newOnPage === 0) break
  }

  return allDocs
}

/**
 * Scrape toutes les catégories d'annonces.
 */
export async function scrapeAllAnnonces(): Promise<DocumentInput[]> {
  const all: DocumentInput[] = []
  for (const cat of ANNONCE_CATEGORIES) {
    const docs = await scrapeAnnonceCategorie(cat, 1)
    all.push(...docs)
  }
  console.log(`[brvm-org] scrapeAllAnnonces total: ${all.length}`)
  return all
}

/* ── Diagnostic public (utilisé par /api/brvm/diagnose) ─────────── */

export type DiagnosticSection = {
  section: string
  url_fetched: string | null
  status: number | null
  title: string | null
  pdf_links_found: number
  error?: string
}

/**
 * Retourne un diagnostic détaillé de chaque section BRVM sans rien insérer
 * en base. Utilisé par l'admin pour savoir exactement où le scraping casse.
 */
export async function diagnoseBrvmOrg(): Promise<DiagnosticSection[]> {
  const results: DiagnosticSection[] = []

  // BOC
  const boc = await extractPdfsFromPage(
    [
      `${BASE}/fr/bulletins-officiels-de-la-cote`,
      `${BASE}/fr/bulletins-officiels-de-la-cote.html`,
    ],
    'boc'
  )
  results.push({ section: 'boc', ...boc.diagnostic })

  // Rapports
  const rapports = await extractPdfsFromPage([
    `${BASE}/fr/rapports-societes-cotees`,
    `${BASE}/fr/rapports-societe-cotes`,
  ])
  results.push({ section: 'rapports', ...rapports.diagnostic })

  // Annonces — juste communiqués pour ne pas hammerer
  for (const cat of ['communiques', 'changements-de-dirigeants', 'franchissements-de-seuil'] as const) {
    const res = await extractPdfsFromPage([
      `${BASE}/fr/emetteurs/type-annonces/${cat}`,
      `${BASE}/fr/emetteurs/type-annonces/${cat}.html`,
    ])
    results.push({ section: `annonces/${cat}`, ...res.diagnostic })
  }

  return results
}
