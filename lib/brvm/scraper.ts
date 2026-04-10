/**
 * Scraper BRVM complet — cheerio pour parser le HTML.
 * Sources : brvm.org (primaire), sikafinance.com (fallback).
 * Ne crashe jamais : retourne null ou [] en cas d'erreur.
 */

import * as cheerio from 'cheerio'

const BRVM_BASE = 'https://www.brvm.org/fr'
const SIKA_BASE = 'https://www.sikafinance.com'
const TIMEOUT = 20_000

/* ── Types ──────────────────────────────────────────────────── */

export type ResumeSeance = {
  date: string
  valeur_transactions: string | null
  cap_actions: string | null
  cap_obligations: string | null
  brvm_c: string | null
  brvm_30: string | null
  brvm_pres: string | null
  top5: { ticker: string; nom: string; variation: string }[]
  flop5: { ticker: string; nom: string; variation: string }[]
}

export type CoursAction = {
  ticker: string
  nom: string
  cours: string
  variation: string
  volume: string
  valeur: string
}

export type IndiceData = {
  name: string
  value: string
  variation: string
  category: 'general' | 'sectoriel' | 'return'
}

export type BocPdf = {
  url: string
  buffer: Buffer
  date: string
}

export type Annonce = {
  title: string
  date: string
  emetteur: string
  categorie: string
  pdfUrl: string | null
}

/* ── Fetch utilitaire ───────────────────────────────────────── */

async function safeFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Hedjav-BRVM-Scraper/2.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.error(`[brvm-scraper] HTTP ${res.status} pour ${url}`)
      return null
    }
    return await res.text()
  } catch (e) {
    console.error(`[brvm-scraper] fetch echoue pour ${url}:`, e instanceof Error ? e.message : e)
    return null
  }
}

async function safeFetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Hedjav-BRVM-Scraper/2.0' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } catch (e) {
    console.error(`[brvm-scraper] fetchBuffer echoue pour ${url}:`, e instanceof Error ? e.message : e)
    return null
  }
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/* ── 1. Resume de seance ────────────────────────────────────── */

export async function scrapeResumeSeance(): Promise<ResumeSeance | null> {
  try {
    const html = await safeFetch(`${BRVM_BASE}/resume`)
    if (html) {
      const result = parseResumeFromBrvm(html)
      if (result) return result
    }

    // Fallback sikafinance
    console.warn('[brvm-scraper] Fallback sikafinance pour resume seance')
    const sikaHtml = await safeFetch(`${SIKA_BASE}/marches/aaz`)
    if (sikaHtml) {
      return parseResumeFromSika(sikaHtml)
    }

    return null
  } catch (e) {
    console.error('[brvm-scraper] scrapeResumeSeance error:', e)
    return null
  }
}

function parseResumeFromBrvm(html: string): ResumeSeance | null {
  try {
    const $ = cheerio.load(html)
    const today = new Date().toISOString().slice(0, 10)

    // Extraire la date de la page
    let date = today
    const dateEl = $('h1, .date, .page-title, .field--name-field-date').first().text()
    const dateMatch = dateEl.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/)
    if (dateMatch) {
      date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    }

    // Extraire les valeurs du resume
    let valeur_transactions: string | null = null
    let cap_actions: string | null = null
    let cap_obligations: string | null = null
    let brvm_c: string | null = null
    let brvm_30: string | null = null
    let brvm_pres: string | null = null

    // Chercher dans les tables et divs
    $('table tr, .field, .views-field, .resume-item, div').each((_, el) => {
      const text = cleanText($(el).text()).toLowerCase()
      const vals = text.match(/[\d\s,.]+/g)
      const val = vals ? vals[vals.length - 1]?.trim() : null

      if (text.includes('valeur des transactions') && val) valeur_transactions = val
      if (text.includes('capitalisation actions') && val) cap_actions = val
      if (text.includes('capitalisation obligations') && val) cap_obligations = val
      if (text.includes('brvm composite') && !text.includes('return') && val) brvm_c = val
      if (text.includes('brvm 30') && val) brvm_30 = val
      if (text.includes('brvm prestige') && val) brvm_pres = val
    })

    // Extraire top 5 hausses et baisses
    const top5: ResumeSeance['top5'] = []
    const flop5: ResumeSeance['flop5'] = []

    const tables = $('table')
    tables.each((_, table) => {
      const caption = cleanText($(table).find('caption, thead th, h3, h4').first().text()).toLowerCase()
      const rows = $(table).find('tbody tr, tr').slice(1)

      if (caption.includes('hausse') || caption.includes('top')) {
        rows.each((_, row) => {
          const cells = $(row).find('td')
          if (cells.length >= 2 && top5.length < 5) {
            top5.push({
              ticker: cleanText(cells.eq(0).text()),
              nom: cleanText(cells.eq(1).text()),
              variation: cleanText(cells.eq(cells.length - 1).text()),
            })
          }
        })
      }

      if (caption.includes('baisse') || caption.includes('flop')) {
        rows.each((_, row) => {
          const cells = $(row).find('td')
          if (cells.length >= 2 && flop5.length < 5) {
            flop5.push({
              ticker: cleanText(cells.eq(0).text()),
              nom: cleanText(cells.eq(1).text()),
              variation: cleanText(cells.eq(cells.length - 1).text()),
            })
          }
        })
      }
    })

    return {
      date,
      valeur_transactions,
      cap_actions,
      cap_obligations,
      brvm_c,
      brvm_30,
      brvm_pres,
      top5,
      flop5,
    }
  } catch (e) {
    console.error('[brvm-scraper] parseResumeFromBrvm error:', e)
    return null
  }
}

function parseResumeFromSika(html: string): ResumeSeance | null {
  try {
    const $ = cheerio.load(html)
    const today = new Date().toISOString().slice(0, 10)

    const top5: ResumeSeance['top5'] = []
    const flop5: ResumeSeance['flop5'] = []

    // Sikafinance structure may differ - parse tables
    $('table').each((_, table) => {
      const rows = $(table).find('tr')
      rows.each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length >= 3) {
          const ticker = cleanText(cells.eq(0).text())
          const variation = cleanText(cells.eq(cells.length - 1).text())
          if (variation.startsWith('+') && top5.length < 5) {
            top5.push({ ticker, nom: ticker, variation })
          } else if (variation.startsWith('-') && flop5.length < 5) {
            flop5.push({ ticker, nom: ticker, variation })
          }
        }
      })
    })

    return {
      date: today,
      valeur_transactions: null,
      cap_actions: null,
      cap_obligations: null,
      brvm_c: null,
      brvm_30: null,
      brvm_pres: null,
      top5,
      flop5,
    }
  } catch (e) {
    console.error('[brvm-scraper] parseResumeFromSika error:', e)
    return null
  }
}

/* ── 2. Cours des actions ───────────────────────────────────── */

export async function scrapeCoursActions(): Promise<CoursAction[]> {
  try {
    const html = await safeFetch(`${BRVM_BASE}/cours-actions/0`)
    if (!html) return []

    const $ = cheerio.load(html)
    const actions: CoursAction[] = []

    $('table').each((_, table) => {
      const headers = $(table).find('thead th, th')
        .map((__, th) => cleanText($(th).text()).toLowerCase())
        .get()

      // Verify this is the right table (should have columns like ticker/symbole, cours, variation)
      const hasRelevantHeaders = headers.some(
        (h) => h.includes('symbole') || h.includes('ticker') || h.includes('titre'),
      )

      if (!hasRelevantHeaders && headers.length < 3) return

      $(table).find('tbody tr, tr').each((__, row) => {
        const cells = $(row).find('td')
        if (cells.length < 3) return

        const ticker = cleanText(cells.eq(0).text())
        if (!ticker || ticker.length > 20) return // skip header-like rows

        actions.push({
          ticker,
          nom: cells.length > 1 ? cleanText(cells.eq(1).text()) : ticker,
          cours: cells.length > 2 ? cleanText(cells.eq(2).text()) : '',
          variation: cells.length > 3 ? cleanText(cells.eq(3).text()) : '',
          volume: cells.length > 4 ? cleanText(cells.eq(4).text()) : '',
          valeur: cells.length > 5 ? cleanText(cells.eq(5).text()) : '',
        })
      })
    })

    return actions
  } catch (e) {
    console.error('[brvm-scraper] scrapeCoursActions error:', e)
    return []
  }
}

/* ── 3. Indices (generaux + sectoriels) ─────────────────────── */

export async function scrapeIndices(): Promise<IndiceData[]> {
  try {
    const html = await safeFetch(`${BRVM_BASE}/cours-indices/0`)
    if (!html) return []

    const $ = cheerio.load(html)
    const indices: IndiceData[] = []

    $('table').each((_, table) => {
      $(table).find('tbody tr, tr').each((__, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return

        const name = cleanText(cells.eq(0).text())
        const value = cleanText(cells.eq(1).text())
        const variation = cells.length > 2 ? cleanText(cells.eq(2).text()) : ''

        if (!name || !value || /^\s*$/.test(name)) return

        // Classify
        let category: IndiceData['category'] = 'general'
        const lowerName = name.toLowerCase()
        if (
          lowerName.includes('agriculture') ||
          lowerName.includes('industrie') ||
          lowerName.includes('distribution') ||
          lowerName.includes('transport') ||
          lowerName.includes('finance') ||
          lowerName.includes('services publics') ||
          lowerName.includes('autres')
        ) {
          category = 'sectoriel'
        } else if (lowerName.includes('return') || lowerName.includes('rendement')) {
          category = 'return'
        }

        indices.push({ name, value, variation, category })
      })
    })

    return indices
  } catch (e) {
    console.error('[brvm-scraper] scrapeIndices error:', e)
    return []
  }
}

/* ── 4. BOC PDF quotidien ───────────────────────────────────── */

export async function scrapeBocPdf(date: Date): Promise<BocPdf | null> {
  try {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const dateStr = `${y}${m}${d}`
    const url = `https://bfin.brvm.org/boc/BOC_JOUR/BOC_${dateStr}.pdf`

    const buffer = await safeFetchBuffer(url)
    if (!buffer || buffer.length < 500) return null // too small = error page

    return {
      url,
      buffer,
      date: `${y}-${m}-${d}`,
    }
  } catch (e) {
    console.error('[brvm-scraper] scrapeBocPdf error:', e)
    return null
  }
}

/* ── 5. Annonces emetteurs ──────────────────────────────────── */

export async function scrapeAnnonces(): Promise<Annonce[]> {
  try {
    const html = await safeFetch(`${BRVM_BASE}/annonces-emetteurs`)
    if (!html) return []

    const $ = cheerio.load(html)
    const annonces: Annonce[] = []

    // Parse annonces from table or list
    $('table tbody tr, .views-row, .node--type-annonce, article').each((_, el) => {
      const cells = $(el).find('td')

      if (cells.length >= 2) {
        // Table format
        const title = cleanText(cells.eq(0).text()) || cleanText(cells.eq(1).text())
        const date = cleanText(cells.eq(cells.length > 3 ? 2 : 1).text())
        const emetteur = cells.length > 2 ? cleanText(cells.eq(1).text()) : ''
        const categorie = cells.length > 3 ? cleanText(cells.eq(3).text()) : ''
        const pdfLink = $(el).find('a[href*=".pdf"]').attr('href') ?? null
        const pdfUrl = pdfLink
          ? pdfLink.startsWith('http')
            ? pdfLink
            : `https://www.brvm.org${pdfLink}`
          : null

        if (title && title.length > 3) {
          annonces.push({ title, date, emetteur, categorie, pdfUrl })
        }
      } else {
        // Article/node format
        const title = cleanText($(el).find('h2, h3, .field--name-title, a').first().text())
        const date = cleanText($(el).find('.date, time, .field--name-field-date').first().text())
        const pdfLink = $(el).find('a[href*=".pdf"]').attr('href') ?? null
        const pdfUrl = pdfLink
          ? pdfLink.startsWith('http')
            ? pdfLink
            : `https://www.brvm.org${pdfLink}`
          : null

        if (title && title.length > 3) {
          annonces.push({ title, date, emetteur: '', categorie: '', pdfUrl })
        }
      }
    })

    return annonces.slice(0, 20)
  } catch (e) {
    console.error('[brvm-scraper] scrapeAnnonces error:', e)
    return []
  }
}

/* ── 6. Rapports societes cotees (par secteur) ──────────────── */

export async function scrapeRapportsSocietes(): Promise<Annonce[]> {
  try {
    const html = await safeFetch(`${BRVM_BASE}/publications/rapports-annuels`)
    if (!html) return []

    const $ = cheerio.load(html)
    const rapports: Annonce[] = []

    $('table tbody tr, .views-row, article').each((_, el) => {
      const cells = $(el).find('td')
      if (cells.length >= 2) {
        const title = cleanText(cells.eq(0).text())
        const emetteur = cells.length > 1 ? cleanText(cells.eq(1).text()) : ''
        const date = cells.length > 2 ? cleanText(cells.eq(2).text()) : ''
        const pdfLink = $(el).find('a[href*=".pdf"]').attr('href') ?? null
        const pdfUrl = pdfLink
          ? pdfLink.startsWith('http')
            ? pdfLink
            : `https://www.brvm.org${pdfLink}`
          : null

        if (title && title.length > 3) {
          rapports.push({ title, date, emetteur, categorie: 'rapport-annuel', pdfUrl })
        }
      } else {
        const title = cleanText($(el).find('h2, h3, a').first().text())
        const pdfLink = $(el).find('a[href*=".pdf"]').attr('href') ?? null
        const pdfUrl = pdfLink
          ? pdfLink.startsWith('http')
            ? pdfLink
            : `https://www.brvm.org${pdfLink}`
          : null

        if (title && title.length > 3) {
          rapports.push({ title, date: '', emetteur: '', categorie: 'rapport-annuel', pdfUrl })
        }
      }
    })

    return rapports.slice(0, 50)
  } catch (e) {
    console.error('[brvm-scraper] scrapeRapportsSocietes error:', e)
    return []
  }
}
