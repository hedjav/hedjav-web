/**
 * Scraper BRVM léger — fetch + regex.
 * Récupère indices et actualités depuis brvm.org.
 * Ne crashe jamais : retourne des données vides en cas d'erreur.
 */

export type BRVMIndex = {
  name: string
  value: string
  variation: string
}

export type BRVMNews = {
  title: string
  summary: string
  date: string
  url: string
}

const BASE = 'https://www.brvm.org'
const TIMEOUT = 15_000

async function safeFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Hedjav-BRVM-Scraper/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.error(`[brvm-scraper] HTTP ${res.status} pour ${url}`)
      return null
    }
    return await res.text()
  } catch (e) {
    console.error(`[brvm-scraper] fetch échoué pour ${url}:`, e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Scrape les indices BRVM (BRVM Composite, BRVM 30, etc.)
 * depuis la page d'accueil ou /cours-indices.
 */
export async function scrapeBRVMIndices(): Promise<{
  date: string
  indices: BRVMIndex[]
}> {
  const html = await safeFetch(`${BASE}/cours-indices/0`)
  if (!html) {
    return { date: new Date().toISOString().slice(0, 10), indices: [] }
  }

  const indices: BRVMIndex[] = []

  // Pattern pour les lignes de tableau contenant les indices
  // Les pages BRVM utilisent des tableaux HTML avec les données d'indices
  const rowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(html)) !== null) {
    const name = stripTags(match[1]).trim()
    const value = stripTags(match[2]).trim()
    const variation = stripTags(match[3]).trim()

    // Filtrer les indices pertinents (BRVM Composite, BRVM 30, etc.)
    if (name && value && /brvm|composite|indice/i.test(name)) {
      indices.push({ name, value, variation })
    }
  }

  // Si le pattern ne matche pas, essayer un pattern plus large
  if (indices.length === 0) {
    const altPattern = /(?:BRVM[\s-]*(?:Composite|30|Prestige|10))[^<]*?[\s:]+?([\d\s,.]+)[\s\S]*?([+-]?[\d,.]+\s*%?)/gi
    while ((match = altPattern.exec(html)) !== null) {
      const fullMatch = match[0]
      const nameMatch = fullMatch.match(/BRVM[\s-]*(?:Composite|30|Prestige|10)/i)
      if (nameMatch) {
        indices.push({
          name: nameMatch[0].trim(),
          value: match[1].trim(),
          variation: match[2].trim(),
        })
      }
    }
  }

  // Extraire la date de la page
  const dateMatch = html.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/)
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10)

  return { date, indices }
}

/**
 * Scrape les actualités BRVM depuis la section actualités.
 */
export async function scrapeBRVMNews(): Promise<BRVMNews[]> {
  const html = await safeFetch(`${BASE}/actualites`)
  if (!html) return []

  const news: BRVMNews[] = []

  // Pattern pour les blocs d'actualité (titres + liens)
  const articlePattern = /<a[^>]*href=["']([^"']*actualit[^"']*)["'][^>]*>[\s\S]*?<[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi
  let match: RegExpExecArray | null

  while ((match = articlePattern.exec(html)) !== null) {
    const url = match[1].startsWith('http') ? match[1] : `${BASE}${match[1]}`
    const title = stripTags(match[2]).trim()
    if (title && title.length > 5) {
      news.push({ title, summary: '', date: '', url })
    }
  }

  // Pattern alternatif : blocs avec h2/h3 + lien
  if (news.length === 0) {
    const altPattern = /<h[23][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    while ((match = altPattern.exec(html)) !== null) {
      const url = match[1].startsWith('http') ? match[1] : `${BASE}${match[1]}`
      const title = stripTags(match[2]).trim()
      if (title && title.length > 5) {
        news.push({ title, summary: '', date: '', url })
      }
    }
  }

  // Limiter à 10 actualités max
  return news.slice(0, 10)
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, '')
}
