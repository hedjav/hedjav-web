import crypto from 'node:crypto'

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook FedaPay.
 *
 * FedaPay peut envoyer la signature dans différents formats :
 * - Header: x-fedapay-signature (ou X-FedaPay-Signature)
 * - Valeur: "sha256=<hex>" ou juste "<hex>" ou "t=<timestamp>,v1=<hex>"
 *
 * Si FEDAPAY_WEBHOOK_SECRET n'est pas configuré → accepte (dev mode).
 */
export function verifyFedaPaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET

  // Dev mode : pas de secret → accepter
  if (!secret) {
    console.warn('[fedapay] FEDAPAY_WEBHOOK_SECRET not set — accepting webhook without verification')
    return true
  }

  if (!signatureHeader) {
    console.warn('[fedapay] No signature header received')
    return false
  }

  // Compute expected HMAC
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  // Try different signature formats
  let provided = signatureHeader

  // Format: "sha256=<hex>"
  if (provided.startsWith('sha256=')) {
    provided = provided.slice(7)
  }

  // Format: "t=<timestamp>,v1=<hex>" (Stripe-style, some providers use this)
  if (provided.includes(',v1=')) {
    const match = provided.match(/v1=([a-f0-9]+)/)
    if (match) provided = match[1]
  }

  // Format: "ts=<timestamp>,s=<hex>" (another variant)
  if (provided.includes(',s=')) {
    const match = provided.match(/s=([a-f0-9]+)/)
    if (match) provided = match[1]
  }

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(provided.trim(), 'hex'),
      Buffer.from(computed, 'hex'),
    )

    if (!isValid) {
      console.error('[fedapay] Signature mismatch', {
        receivedHeader: signatureHeader.substring(0, 30) + '...',
        computedPrefix: computed.substring(0, 16) + '...',
      })
    }

    return isValid
  } catch (e) {
    console.error('[fedapay] Signature verification error', e)
    // Si le format est vraiment inconnu, on log et on rejette
    return false
  }
}
