/**
 * Helpers HTTP partagés pour les fetches BRVM.
 *
 * Raison d'être : le serveur Drupal de `brvm.org` envoie un cert chain
 * incomplet (intermediate CA manquant). Node.js `fetch` valide strictement
 * et rejette avec `TypeError: fetch failed` (cause: UNABLE_TO_VERIFY_LEAF_SIGNATURE).
 * `curl -k` fonctionne en ignorant ce check — c'est ce qu'on reproduit ici
 * via un `undici.Agent` avec `rejectUnauthorized: false`, **scopé uniquement
 * aux hôtes brvm.org / bfin.brvm.org**.
 *
 * JAMAIS appliquer cet agent globalement — il désactiverait la protection
 * MITM pour toutes les connexions du process (Supabase, FedaPay, SMTP).
 * Utilise `brvmFetchOptions(url)` pour construire les options de fetch avec
 * le bon dispatcher conditionnellement.
 */

import { Agent } from 'undici'

export const BRVM_FETCH_TIMEOUT = 25_000

// User-Agent navigateur standard (brvm.org Drupal 7 filtre parfois les UA exotiques)
export const BRVM_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Agent undici avec validation SSL relâchée.
 * Usage exclusif : hôtes brvm.org et bfin.brvm.org.
 */
const relaxedTlsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
    timeout: BRVM_FETCH_TIMEOUT,
  },
  headersTimeout: BRVM_FETCH_TIMEOUT,
  bodyTimeout: BRVM_FETCH_TIMEOUT,
})

/**
 * Vrai si l'URL pointe vers un hôte brvm.org ou bfin.brvm.org.
 * Tout autre hôte (sikafinance, Supabase, etc.) garde la validation stricte.
 */
export function isBrvmHost(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.hostname === 'www.brvm.org' ||
      u.hostname === 'brvm.org' ||
      u.hostname === 'bfin.brvm.org' ||
      u.hostname.endsWith('.brvm.org')
    )
  } catch {
    return false
  }
}

/**
 * Construit des options de fetch avec les bons headers "browser-like" et,
 * si l'URL est brvm.org, ajoute le dispatcher SSL-relaxé.
 *
 * À utiliser partout où on fait un fetch vers brvm.org (HTML ou binaire PDF).
 */
export function brvmFetchOptions(
  url: string,
  options: RequestInit = {}
): RequestInit & { dispatcher?: Agent } {
  const headers: Record<string, string> = {
    'User-Agent': BRVM_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  }

  const merged: RequestInit & { dispatcher?: Agent } = {
    ...options,
    headers,
    redirect: options.redirect ?? 'follow',
  }

  if (isBrvmHost(url)) {
    merged.dispatcher = relaxedTlsAgent
  }

  return merged
}

/**
 * Extrait le maximum d'info d'une erreur de `fetch()` Node.js.
 * Le message générique "fetch failed" cache la vraie raison dans `e.cause`
 * (DNS, SSL, ECONNREFUSED, ETIMEDOUT, etc.) — on expose toute la chain.
 */
export function extractFetchError(e: unknown): string {
  if (!(e instanceof Error)) return String(e)
  const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause
  const parts: string[] = [e.message]
  if (cause?.code) parts.push(`[${cause.code}]`)
  if (cause?.message && cause.message !== e.message) parts.push(`— ${cause.message}`)
  return parts.join(' ')
}
