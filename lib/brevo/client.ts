/**
 * Client minimal pour l'API Brevo (REST).
 * Si BREVO_API_KEY n'est pas défini, les fonctions retournent { ok: false, skipped: true }
 * sans planter — utile en local et tant que les clés Brevo ne sont pas configurées.
 */

const BASE = 'https://api.brevo.com/v3'

type BrevoResult = { ok: true } | { ok: false; error: string; skipped?: boolean }

function headers() {
  return {
    'Content-Type': 'application/json',
    accept: 'application/json',
    'api-key': process.env.BREVO_API_KEY!,
  }
}

function configured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_NEWSLETTER_LIST_ID)
}

/**
 * Inscription newsletter avec double opt-in.
 * Si BREVO_DOI_TEMPLATE_ID est défini → utilise /contacts/doubleOptinConfirmation (vrai DOI Brevo)
 * Sinon → fallback POST /contacts (sans confirmation, pour dev)
 */
export async function subscribeNewsletter(
  email: string,
  attributes?: Record<string, unknown>,
): Promise<BrevoResult> {
  if (!configured()) {
    console.warn('[brevo] not configured, skipping subscribeNewsletter for', email)
    return { ok: false, error: 'Brevo not configured', skipped: true }
  }

  const listId = Number(process.env.BREVO_NEWSLETTER_LIST_ID)
  const templateId = process.env.BREVO_DOI_TEMPLATE_ID
    ? Number(process.env.BREVO_DOI_TEMPLATE_ID)
    : null
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (templateId) {
    // Vrai double opt-in Brevo
    const res = await fetch(`${BASE}/contacts/doubleOptinConfirmation`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email,
        attributes,
        includeListIds: [listId],
        templateId,
        redirectionUrl: `${origin}/newsletter/confirmation`,
      }),
    })
    if (!res.ok && res.status !== 204) {
      const text = await res.text()
      return { ok: false, error: `Brevo DOI ${res.status}: ${text}` }
    }
    return { ok: true }
  }

  // Fallback : POST /contacts (sans confirmation par email)
  const res = await fetch(`${BASE}/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    }),
  })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    return { ok: false, error: `Brevo contact ${res.status}: ${text}` }
  }
  return { ok: true }
}

/**
 * Envoi d'un email transactionnel via Brevo.
 * Soit textContent + htmlContent, soit templateId + params.
 */
export async function sendTransactionalEmail(opts: {
  to: { email: string; name?: string }
  subject?: string
  htmlContent?: string
  textContent?: string
  templateId?: number
  params?: Record<string, unknown>
}): Promise<BrevoResult> {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[brevo] not configured, skipping sendTransactionalEmail to', opts.to.email)
    return { ok: false, error: 'Brevo not configured', skipped: true }
  }

  const body = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? 'hedjav@gmail.com',
      name: process.env.BREVO_SENDER_NAME ?? 'Hedjav',
    },
    to: [opts.to],
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    textContent: opts.textContent,
    templateId: opts.templateId,
    params: opts.params,
  }

  const res = await fetch(`${BASE}/smtp/email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Brevo smtp ${res.status}: ${text}` }
  }
  return { ok: true }
}
