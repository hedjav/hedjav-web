/**
 * Rate limiting en mémoire (Map) pour les routes API.
 *
 * Utilisation :
 *   const result = checkRateLimit(ip, 5, 60_000)  // 5 requêtes par minute
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })
 */

type Entry = {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Nettoyage périodique pour éviter une fuite mémoire
const CLEANUP_INTERVAL = 60_000 // 1 min
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; error: string; retryAfterMs: number }

/**
 * Vérifie le rate limit pour une clé donnée.
 *
 * @param key     Clé unique (ex: `newsletter:${ip}`)
 * @param max     Nombre max de requêtes dans la fenêtre
 * @param windowMs  Durée de la fenêtre en millisecondes
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1 }
  }

  if (entry.count >= max) {
    return {
      ok: false,
      error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
      retryAfterMs: entry.resetAt - now,
    }
  }

  entry.count++
  return { ok: true, remaining: max - entry.count }
}

/**
 * Extrait l'IP du client depuis les headers de la requête.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return '0.0.0.0'
}
