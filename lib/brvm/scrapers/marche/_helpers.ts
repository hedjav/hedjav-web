/**
 * Helpers partagés pour les 4 scrapers marché BRVM.
 * Fetch résilient + parsing des nombres FCFA format BRVM.
 */

import { BRVM_FETCH_TIMEOUT, brvmFetchOptions, extractFetchError } from '../../http'

export type MarcheFetchResult = {
  url: string
  ok: boolean
  html: string | null
  error?: string
}

export async function fetchMarche(url: string): Promise<MarcheFetchResult> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), BRVM_FETCH_TIMEOUT)
    const res = await fetch(url, brvmFetchOptions(url, { signal: ctrl.signal }))
    clearTimeout(timer)
    if (!res.ok) return { url, ok: false, html: null, error: `HTTP ${res.status}` }
    const html = await res.text()
    if (html.includes('Page non trouvée') || html.includes('Page not found')) {
      return { url, ok: false, html, error: '404 déguisé' }
    }
    return { url, ok: true, html }
  } catch (e) {
    return { url, ok: false, html: null, error: extractFetchError(e) }
  }
}

export async function fetchMarcheFirst(urls: string[]): Promise<MarcheFetchResult> {
  let last: MarcheFetchResult = { url: urls[0], ok: false, html: null, error: 'no candidate' }
  for (const u of urls) {
    const r = await fetchMarche(u)
    if (r.ok) return r
    last = r
  }
  return last
}

/**
 * Parse un nombre BRVM : "1 234 567,89" ou "1,234,567.89" ou "-2,35%" → 1234567.89 / -2.35
 * Retourne null si non parsable.
 */
export function parseBrvmNumber(raw: string | null | undefined): number | null {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s) return null
  s = s.replace(/[\s\u00A0\u202F]/g, '') // espaces (incl. insécables)
  s = s.replace(/%$/, '') // pourcentage final
  s = s.replace(/[+]/g, '') // "+" leading

  const commaCount = (s.match(/,/g) ?? []).length
  const dotCount = (s.match(/\./g) ?? []).length

  if (commaCount > 0 && dotCount > 0) {
    // FR : "1.234,56" → 1234.56 ; EN : "1,234.56" → 1234.56
    // Heuristique : dernière occurrence = séparateur décimal
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (commaCount > 0) {
    // Virgule unique = décimale FR (sauf si suivie de 3 chiffres exacts → milliers)
    if (/,\d{3}(?!\d)/.test(s) && !/\d+,\d{1,2}$/.test(s)) {
      s = s.replace(/,/g, '')
    } else {
      s = s.replace(',', '.')
    }
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Extrait la date de séance depuis un texte BRVM type "Séance du 10 avril 2026".
 * Retourne ISO 'YYYY-MM-DD' ou null.
 */
export function extractSeanceDate(text: string): string | null {
  if (!text) return null
  const months: Record<string, string> = {
    janvier: '01', fevrier: '02', 'février': '02', mars: '03', avril: '04',
    mai: '05', juin: '06', juillet: '07', aout: '08', 'août': '08',
    septembre: '09', octobre: '10', novembre: '11', decembre: '12', 'décembre': '12',
  }
  const m = text
    .toLowerCase()
    .match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i)
  if (m) {
    const month = months[m[2].toLowerCase()]
    if (month) {
      return `${m[3]}-${month}-${m[1].padStart(2, '0')}`
    }
  }
  const m2 = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`
  const m3 = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m3) return m3[0]
  return null
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
