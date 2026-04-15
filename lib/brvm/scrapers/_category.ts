/**
 * Scraper générique "listing PDF" pour une catégorie BRVM donnée.
 *
 * Utilisé par :
 *   - Annonces émetteurs (8 sous-catégories)
 *   - Publications BRVM (7 sous-catégories)
 *   - Rapports sociétés étendus (états financiers, commentaires d'activité)
 *
 * Principe : itère des URLs candidats (avec pagination), extrait tous les
 * liens PDF, classifie par nom de fichier, upsert dans brvm_documents avec
 * doc_family / doc_subtype / emetteur_id rattaché.
 *
 * Chaque nouvelle catégorie = 1 fichier mince qui importe scrapeCategory + config.
 */

import * as cheerio from 'cheerio'
import { BRVM_FETCH_TIMEOUT, brvmFetchOptions, extractFetchError } from '../http'
import { upsertDocument } from '../documents'
import { resolveEmetteur } from '../emetteurs'
import type { DocFamily, DocType, DocumentInput, ScrapeResult } from '../types'

const BASE = 'https://www.brvm.org'

export type CategoryConfig = {
  /** Nom affiché (pour logs). */
  label: string
  /** Famille 4 univers. */
  doc_family: DocFamily
  /** Sous-type métier (clé pour filtres UI). */
  doc_subtype: string
  /** Valeur doc_type legacy à stocker en base (pour compat CHECK constraint). */
  doc_type_legacy: DocType
  /** URLs candidats pour la page HTML de listing. 1er OK gagne. */
  listing_urls: string[]
  /** Pagination `?page=0..N` activée. */
  paginate?: boolean
  /** Nombre max de pages si paginate. */
  max_pages?: number
  /** Filtre optionnel sur le nom de fichier PDF (regex). */
  filename_filter?: RegExp
}

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

function extractDocDateFromUrl(url: string): string | null {
  const m = url.match(/\/(\d{4})(\d{2})(\d{2})[_-]/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const mBoc = url.match(/boc_(\d{4})(\d{2})(\d{2})/i)
  if (mBoc) return `${mBoc[1]}-${mBoc[2]}-${mBoc[3]}`
  return null
}

function extractIssuerSlug(pdfUrl: string): string | null {
  const m1 = pdfUrl.match(/_fs_-_([a-z0-9_]+?)_-_(exercice|rapport|arr|etats|comptes)/i)
  if (m1) return m1[1].replace(/_/g, '-')
  const m2 = pdfUrl.match(/_-_([a-z0-9_]+?)(\.pdf|_\d+\.pdf)/i)
  if (m2) return m2[1].replace(/_/g, '-')
  return null
}

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string | null; error?: string }> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), BRVM_FETCH_TIMEOUT)
    const res = await fetch(url, brvmFetchOptions(url, { signal: ctrl.signal }))
    clearTimeout(timer)
    if (!res.ok) return { ok: false, html: null, error: `HTTP ${res.status}` }
    const html = await res.text()
    if (html.includes('Page non trouvée') || html.includes('Page not found')) {
      return { ok: false, html, error: '404 déguisé' }
    }
    return { ok: true, html }
  } catch (e) {
    return { ok: false, html: null, error: extractFetchError(e) }
  }
}

async function fetchFirstOk(urls: string[]): Promise<{ html: string | null; url: string; error?: string }> {
  let last: { html: string | null; url: string; error?: string } = {
    html: null,
    url: urls[0],
    error: 'no candidate',
  }
  for (const u of urls) {
    const r = await fetchHtml(u)
    if (r.ok && r.html) return { html: r.html, url: u }
    last = { html: null, url: u, error: r.error }
  }
  return last
}

function extractPdfsFromHtml(
  html: string,
  sourceUrl: string,
  config: CategoryConfig
): DocumentInput[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const out: DocumentInput[] = []

  $('a[href$=".pdf"], a[href*=".pdf?"], a[href*="/sites/default/files/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href) return
    const pdfUrl = absUrl(href)
    if (!pdfUrl.toLowerCase().includes('.pdf')) return
    if (config.filename_filter && !config.filename_filter.test(pdfUrl)) return
    if (seen.has(pdfUrl)) return
    seen.add(pdfUrl)

    const linkText = cleanText($(el).text())
    const filename = pdfUrl.split('/').pop() ?? ''
    const docDate =
      extractDocDateFromUrl(pdfUrl) ?? new Date().toISOString().slice(0, 10)

    // Titre
    let title: string
    if (linkText && linkText.length > 5) {
      title = linkText
    } else {
      title = filename
        .replace(/\.pdf$/i, '')
        .replace(/^\d{8}_-_/, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .trim()
        .slice(0, 200) || filename
    }

    const issuerSlug = extractIssuerSlug(pdfUrl)

    out.push({
      source_slug: 'brvm-org',
      doc_type: config.doc_type_legacy,
      doc_family: config.doc_family,
      doc_subtype: config.doc_subtype,
      title,
      doc_date: docDate,
      source_url: sourceUrl,
      pdf_url: pdfUrl,
      issuer_slug: issuerSlug,
      metadata: {
        scraper: `brvm-org/${config.doc_family}/${config.doc_subtype}`,
        link_text: linkText || undefined,
        category_label: config.label,
      },
    })
  })

  return out
}

export async function scrapeCategory(config: CategoryConfig): Promise<ScrapeResult> {
  const started = Date.now()
  let discovered = 0
  let skipped = 0
  let errors = 0
  const details: ScrapeResult['details'] = []

  const maxPages = config.paginate ? config.max_pages ?? 5 : 1
  const allCandidates: string[][] = []
  if (config.paginate) {
    for (let p = 0; p < maxPages; p++) {
      allCandidates.push(config.listing_urls.map((u) => (p === 0 ? u : `${u}?page=${p}`)))
    }
  } else {
    allCandidates.push(config.listing_urls)
  }

  const seenPdfs = new Set<string>()
  for (const candidates of allCandidates) {
    const fetched = await fetchFirstOk(candidates)
    if (!fetched.html) {
      console.warn(`[scrape/${config.doc_subtype}] fetch failed: ${fetched.error}`)
      break // on arrête la pagination dès qu'une page rate
    }

    const docs = extractPdfsFromHtml(fetched.html, fetched.url, config)
    let newOnPage = 0
    for (const doc of docs) {
      if (doc.pdf_url && seenPdfs.has(doc.pdf_url)) continue
      if (doc.pdf_url) seenPdfs.add(doc.pdf_url)

      // Rattachement émetteur si possible
      if (doc.issuer_slug) {
        const emetteur = await resolveEmetteur({ slug: doc.issuer_slug })
        if (emetteur) {
          doc.emetteur_id = emetteur.id
          doc.issuer_name = emetteur.name
          doc.sector = emetteur.sector
        }
      }

      const res = await upsertDocument(doc)
      if (res.status === 'inserted') {
        discovered++
        newOnPage++
        details.push({ title: doc.title, status: 'new' })
      } else if (res.status === 'skipped') {
        skipped++
        details.push({ title: doc.title, status: 'skipped' })
      } else {
        errors++
        details.push({ title: doc.title, status: 'error', error: res.error })
      }
    }

    // Si rien de nouveau sur la page, stop pagination
    if (config.paginate && newOnPage === 0) break
  }

  return {
    source_slug: 'brvm-org',
    doc_type: config.doc_type_legacy,
    discovered,
    skipped,
    errors,
    duration_ms: Date.now() - started,
    details: details.slice(0, 30),
  }
}

/** Helper : scrape plusieurs catégories en séquentiel et agrège les résultats. */
export async function scrapeCategories(configs: CategoryConfig[]): Promise<{
  total_discovered: number
  total_skipped: number
  total_errors: number
  duration_ms: number
  results: Array<ScrapeResult & { subtype: string; label: string }>
}> {
  const started = Date.now()
  const results: Array<ScrapeResult & { subtype: string; label: string }> = []
  for (const cfg of configs) {
    const r = await scrapeCategory(cfg)
    results.push({ ...r, subtype: cfg.doc_subtype, label: cfg.label })
  }
  return {
    total_discovered: results.reduce((s, r) => s + r.discovered, 0),
    total_skipped: results.reduce((s, r) => s + r.skipped, 0),
    total_errors: results.reduce((s, r) => s + r.errors, 0),
    duration_ms: Date.now() - started,
    results,
  }
}
