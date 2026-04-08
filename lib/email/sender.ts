/**
 * Email sender — remplace lib/brevo/client.ts.
 *
 * Stratégie :
 *  - Si RESEND_API_KEY est défini → envoi via Resend (https://resend.com)
 *  - Sinon → log dans la console (utile en dev / quand la clé n'est pas encore configurée)
 *
 * Gracefully no-op : ne plante jamais.
 */

type EmailResult = { ok: true } | { ok: false; error: string; skipped?: boolean }

type SendOptions = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
}

const DEFAULT_FROM = process.env.HEDJAV_SENDER_EMAIL ?? 'hedjav@gmail.com'
const DEFAULT_FROM_NAME = process.env.HEDJAV_SENDER_NAME ?? 'Hedjav'

export async function sendEmail(opts: SendOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  // Mode dev / non configuré → on log dans la console et on retourne ok
  if (!apiKey) {
    console.log('\n📧 [email:console-fallback]')
    console.log('  to     :', Array.isArray(opts.to) ? opts.to.join(', ') : opts.to)
    console.log('  subject:', opts.subject)
    console.log('  preview:', (opts.text ?? opts.html ?? '').slice(0, 200))
    console.log()
    return { ok: false, error: 'RESEND_API_KEY not set', skipped: true }
  }

  const body = {
    from: opts.from ?? `${DEFAULT_FROM_NAME} <${DEFAULT_FROM}>`,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    reply_to: opts.replyTo,
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[email] Resend error', res.status, text)
      return { ok: false, error: `Resend ${res.status}: ${text}` }
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: message }
  }
}
