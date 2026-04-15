/**
 * Module email BRVM — façade unique.
 *
 * Un seul endroit à importer pour construire un email BRVM cohérent :
 *   - Digest (daily / weekly / monthly / manual)
 *   - Alerte instantanée (1-N docs prioritaires)
 *
 * Les 4 formats partagent les primitives de `./primitives.ts` (palette univers,
 * badges, tags, ligne document, encart IA, KPIs, empty state, CTA) ce qui
 * garantit la cohérence visuelle recherchée par la section 9 du brief.
 */

export { buildBrvmDigestEmail, type DigestFrequency, FAMILY_PALETTE } from './digest'
export { buildBrvmAlertEmail } from './alert'
export { filterDedup, getRecentlySentDocIds, hashDocIds } from './dedup'
