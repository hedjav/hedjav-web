/**
 * Politique d'expiration de session par inactivité — Hedjav / EGP.
 *
 * Voir docs/SESSION_SECURITY_POLICY.md pour la doctrine produit.
 *
 * Règles :
 *  - Session Supabase (refresh token) ≈ 1 an par défaut. On ne la touche pas.
 *  - L'inactivité applicative se mesure sur profiles.last_visit_at.
 *  - Admin plus strict que membre : ratio ~24× (minutes vs jours).
 *  - Les actions de navigation et les POST API appellent /api/auth/activity-touch
 *    pour rafraîchir last_visit_at.
 *  - Si last_visit_at est NULL (profil legacy) → on considère la session active
 *    pour ne pas kicker des comptes valides lors du déploiement.
 */

export type MemberRole = 'admin' | 'member'

const ADMIN_DEFAULT_MIN = 30
const MEMBER_DEFAULT_DAYS = 7

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const v = Number(raw)
  if (!Number.isFinite(v) || v <= 0) return fallback
  return Math.floor(v)
}

/**
 * Seuil d'inactivité en millisecondes pour un rôle donné.
 * Configurables via env :
 *  - ADMIN_INACTIVITY_MIN  (défaut 30)
 *  - MEMBER_INACTIVITY_DAYS (défaut 7)
 */
export function inactivityThresholdMs(role: MemberRole): number {
  if (role === 'admin') {
    const mins = parsePositiveInt(process.env.ADMIN_INACTIVITY_MIN, ADMIN_DEFAULT_MIN)
    return mins * 60 * 1000
  }
  const days = parsePositiveInt(process.env.MEMBER_INACTIVITY_DAYS, MEMBER_DEFAULT_DAYS)
  return days * 24 * 60 * 60 * 1000
}

/**
 * true si la session applicative doit être forcée-expirée.
 * Ne PAS renvoyer true quand lastVisitAt est NULL (profil legacy).
 */
export function isInactive(lastVisitAt: string | null | undefined, role: MemberRole): boolean {
  if (!lastVisitAt) return false
  const last = new Date(lastVisitAt).getTime()
  if (!Number.isFinite(last)) return false
  return Date.now() - last > inactivityThresholdMs(role)
}

/**
 * Valeur lisible pour afficher à l'utilisateur la durée de sa session restante.
 */
export function inactivityLabel(role: MemberRole): string {
  if (role === 'admin') {
    const mins = parsePositiveInt(process.env.ADMIN_INACTIVITY_MIN, ADMIN_DEFAULT_MIN)
    return `${mins} minutes`
  }
  const days = parsePositiveInt(process.env.MEMBER_INACTIVITY_DAYS, MEMBER_DEFAULT_DAYS)
  return `${days} jour${days > 1 ? 's' : ''}`
}
