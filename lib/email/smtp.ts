/**
 * Client SMTP Hostinger — remplace Resend.
 *
 * Si SMTP_HOST n'est pas défini → console.log (graceful no-op pour le dev local).
 */

import nodemailer from 'nodemailer'

type EmailResult = { ok: true } | { ok: false; error: string; skipped?: boolean }

type SendOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

const FROM = process.env.SMTP_FROM ?? 'noreply@egp.hedjav.com'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  })
}

export async function sendEmail(opts: SendOptions): Promise<EmailResult> {
  if (!process.env.SMTP_HOST) {
    console.log('\n📧 [email:console-fallback]')
    console.log('  to     :', Array.isArray(opts.to) ? opts.to.join(', ') : opts.to)
    console.log('  subject:', opts.subject)
    console.log('  preview:', (opts.text ?? opts.html ?? '').slice(0, 200))
    console.log()
    return { ok: false, error: 'SMTP_HOST not set', skipped: true }
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `Hedjav <${FROM}>`,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo ?? 'hedjav@gmail.com',
    })
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    console.error('[email] SMTP error:', message)
    return { ok: false, error: message }
  }
}
