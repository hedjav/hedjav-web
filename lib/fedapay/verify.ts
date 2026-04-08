import crypto from 'node:crypto'

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook FedaPay.
 * Header : x-fedapay-signature: sha256=<hex>
 * Si FEDAPAY_WEBHOOK_SECRET n'est pas configuré, retourne false (sécurité par défaut).
 */
export function verifyFedaPaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(computed, 'hex'),
    )
  } catch {
    return false
  }
}
