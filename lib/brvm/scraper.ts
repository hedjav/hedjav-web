/**
 * Scraper BRVM complet — cheerio pour parser le HTML.
 * Source PRINCIPALE : sikafinance.com (brvm.org souvent inaccessible).
 * Fallback brvm.org pour BOC PDF, annonces, rapports uniquement.
 * Ne crashe jamais : retourne null ou [] en cas d'erreur.
 */

import * as cheerio from 'cheerio'

const SIKA = 'https://www.sikafinance.com'
const BRVM = 'https://www.brvm.org/fr'
const TIMEOUT = 15_000

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
        'User-Agent': 'Hedjav-BRVM-Scraper/3.0',
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
      headers: { 'User-Agent': 'Hedjav-BRVM-Scraper/3.0' },
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

/** Parse un nombre depuis une string fr (espaces, virgules) */
function parseNumber(text: string): number {
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

/* ── 1. Cours des actions — sikafinance.com/marches/aaz → #tblShare ── */

export async function scrapeCoursActions(): Promise<CoursAction[]> {
  try {
    const html = await safeFetch(`${SIKA}/marches/aaz`)
    if (!html) return []

    const $ = cheerio.load(html)
    const actions: CoursAction[] = []

    $('#tblShare tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 5) return

      const ticker = cleanText(cells.eq(0).text())
      if (!ticker || ticker.length > 30) return

      actions.push({
        ticker,
        nom: ticker,
        cours: cleanText(cells.eq(2).text()),      // Cloture
        variation: cleanText(cells.eq(3).text()),   // Plus haut (variation)
        volume: cleanText(cells.eq(5).text()),
        valeur: cleanText(cells.eq(6).text()),
      })
    })

    if (actions.length > 0) {
      console.log(`[brvm-scraper] ${actions.length} actions depuis sikafinance.com`)
    }
    return actions
  } catch (e) {
    console.error('[brvm-scraper] scrapeCoursActions error:', e)
    return []
  }
}

/* ── 2. Indices — sikafinance.com/marches/aaz → #tabQuotes2 ───────── */

export async function scrapeIndices(): Promise<IndiceData[]> {
  try {
    const html = await safeFetch(`${SIKA}/marches/aaz`)
    if (!html) return []

    const $ = cheerio.load(html)
    const indices: IndiceData[] = []

    $('#tabQuotes2 tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 2) return

      const name = cleanText(cells.eq(0).text())
      const value = cleanText(cells.eq(1).text())
      const variation = cells.length > 2 ? cleanText(cells.eq(2).text()) : ''

      if (!name || !value) return

      // Classifier l'indice
      const lower = name.toLowerCase()
      let category: IndiceData['category'] = 'sectoriel'
      if (
        lower.includes('brvm composite') ||
        lower.includes('brvm 30') ||
        lower.includes('brvm prestige')
      ) {
        if (lower.includes('return') || lower.includes('rendement')) {
          category = 'return'
        } else {
          category = 'general'
        }
      } else if (lower.includes('return') || lower.includes('rendement')) {
        category = 'return'
      }

      indices.push({ name, value, variation, category })
    })

    if (indices.length > 0) {
      console.log(`[brvm-scraper] ${indices.length} indices depuis sikafinance.com`)
    }
    return indices
  } catch (e) {
    console.error('[brvm-scraper] scrapeIndices error:', e)
    return []
  }
}

/* ── 3. Resume de seance — construit depuis cours + indices ────────── */

export async function scrapeResumeSeance(): Promise<ResumeSeance | null> {
  try {
    const [cours, indices] = await Promise.all([scrapeCoursActions(), scrapeIndices()])
    if (cours.length === 0 && indices.length === 0) return null

    const today = new Date().toISOString().slice(0, 10)

    // Calculer top 5 hausses et top 5 baisses par variation
    const withVar = cours
      .map((c) => ({ ...c, varNum: parseNumber(c.variation) }))
      .filter((c) => !isNaN(c.varNum) && c.varNum !== 0)
      .sort((a, b) => b.varNum - a.varNum)

    const top5 = withVar
      .filter((c) => c.varNum > 0)
      .slice(0, 5)
      .map((c) => ({ ticker: c.ticker, nom: c.nom, variation: c.variation }))

    const flop5 = withVar
      .filter((c) => c.varNum < 0)
      .slice(-5)
      .reverse()
      .map((c) => ({ ticker: c.ticker, nom: c.nom, variation: c.variation }))

    // Extraire indices principaux
    const brvm_c =
      indices.find((i) => i.name.toLowerCase().includes('composite') && !i.name.toLowerCase().includes('return'))
        ?.value ?? null
    const brvm_30 =
      indices.find((i) => i.name.toLowerCase().includes('brvm 30') && !i.name.toLowerCase().includes('return'))
        ?.value ?? null
    const brvm_pres =
      indices.find((i) => i.name.toLowerCase().includes('prestige') && !i.name.toLowerCase().includes('return'))
        ?.value ?? null

    return {
      date: today,
      valeur_transactions: null,
      cap_actions: null,
      cap_obligations: null,
      brvm_c,
      brvm_30,
      brvm_pres,
      top5,
      flop5,
    }
  } catch (e) {
    console.error('[brvm-scraper] scrapeResumeSeance error:', e)
    return null
  }
}

/* ── 4. BOC PDF quotidien — brvm.org (seul endroit avec les PDFs) ─── */

export async function scrapeBocPdf(date: Date): Promise<BocPdf | null> {
  try {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const dateStr = `${y}${m}${d}`
    const url = `https://bfin.brvm.org/boc/BOC_JOUR/BOC_${dateStr}.pdf`

    const buffer = await safeFetchBuffer(url)
    if (!buffer || buffer.length < 500) return null // trop petit = page d'erreur

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

/* ── 5. Annonces emetteurs — brvm.org (souvent down, echoue silencieusement) */

export async function scrapeAnnonces(): Promise<Annonce[]> {
  try {
    const html = await safeFetch(`${BRVM}/annonces-emetteurs`)
    if (!html) return []

    const $ = cheerio.load(html)
    const annonces: Annonce[] = []

    $('table tbody tr, .views-row, .node--type-annonce, article').each((_, el) => {
      const cells = $(el).find('td')

      if (cells.length >= 2) {
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

/* ── 6. Rapports societes cotees — brvm.org (fallback silencieux) ──── */

export async function scrapeRapportsSocietes(): Promise<Annonce[]> {
  try {
    const html = await safeFetch(`${BRVM}/publications/rapports-annuels`)
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
