import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/smtp'
import { leadMagnetEmail } from '@/lib/email/templates'
import { incrementPopupSubmitted } from '@/lib/popup/queries'
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  // Rate limit : 3 requêtes par minute par IP
  const rl = checkRateLimit(`popup:${getClientIp(request)}`, 3, 60_000)
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 })

  let body: { email?: string; first_name?: string; ebook_id?: string; popup_config_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { email, first_name, ebook_id, popup_config_id } = body
  if (!email || !ebook_id) {
    return NextResponse.json({ error: 'email et ebook_id requis' }, { status: 400 })
  }

  // Validation email basique
  if (!email.includes('@') || email.length < 5) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: ebook } = await db
    .from('ebooks')
    .select('title, lead_magnet_url')
    .eq('id', ebook_id)
    .single()

  if (!ebook?.lead_magnet_url) {
    return NextResponse.json({ error: 'Pas de lead magnet pour cet ebook' }, { status: 404 })
  }

  const tpl = leadMagnetEmail(first_name ?? '', ebook.title, ebook.lead_magnet_url)
  await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text })

  if (popup_config_id) {
    await incrementPopupSubmitted(popup_config_id)
  }

  return NextResponse.json({ ok: true })
}
