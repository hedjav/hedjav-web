/**
 * Helper canonique d'URL Hedjav / EGP.
 *
 * Source unique pour toutes les URLs générées côté serveur :
 * emails, redirects Supabase Auth, callbacks FedaPay, tracking pixels,
 * liens internes dans les digests, etc.
 *
 * Règle produit non négociable :
 *  - JAMAIS de fallback localhost en prod.
 *  - Tous les liens email pointent vers https://egp.hedjav.com.
 *
 * Source de vérité :
 *  1. process.env.NEXT_PUBLIC_APP_URL (ex : https://egp.hedjav.com)
 *  2. process.env.NEXT_PUBLIC_SITE_URL (fallback historique)
 *  3. https://egp.hedjav.com (dernier recours, en PROD — ne PAS mettre localhost)
 *
 * Note : pour tester en dev local, définir explicitement dans .env.local :
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 */

const PROD_FALLBACK = 'https://egp.hedjav.com'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function resolveBase(): string {
  const fromApp = process.env.NEXT_PUBLIC_APP_URL
  if (fromApp && fromApp.length > 0) return trimTrailingSlash(fromApp)
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL
  if (fromSite && fromSite.length > 0) return trimTrailingSlash(fromSite)
  return PROD_FALLBACK
}

/**
 * Construit une URL absolue à partir d'un chemin relatif.
 * Si path est vide : retourne la base seule (sans slash final).
 */
export function siteUrl(path = ''): string {
  const base = resolveBase()
  if (!path) return base
  const cleaned = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleaned}`
}

/**
 * Retourne uniquement la base (sans chemin). Pratique pour les constantes
 * qui préfixent ensuite des paths dynamiques.
 */
export function siteBase(): string {
  return resolveBase()
}

/**
 * Indique si l'URL configurée est une URL de développement local.
 * Utile pour loguer des avertissements en prod.
 */
export function isLocalSite(): boolean {
  const base = resolveBase()
  return base.includes('localhost') || base.includes('127.0.0.1')
}
