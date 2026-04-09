import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/claude/client'

const SYSTEM = `Tu es le copywriter de Hedjav, école de gestion de patrimoine pour l'Afrique francophone (UEMOA). Style africain direct et chaleureux. Tutoiement. Exemples en FCFA. Références locales (BRVM, Wave, BOA). Pas de jargon marketing occidental. Le HTML doit utiliser la charte Hedjav : header navy #1B2A4A, fond cream #F8F5EE, bouton CTA or #C5A028, texte #1B2A4A. CSS inline uniquement. Retourne UNIQUEMENT le HTML du body (pas de doctype, pas de <html>, pas de <head>). Commence par un <h1>.`

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaign_id, position, context } = await request.json()
  if (!campaign_id || position == null) {
    return NextResponse.json({ error: 'campaign_id et position requis' }, { status: 400 })
  }

  const prompt = `Génère l'email #${position} d'une séquence de campagne email pour Hedjav.

Contexte : ${context ?? 'Email de la séquence de bienvenue pour les nouveaux abonnés intéressés par la gestion de patrimoine en zone UEMOA.'}

Génère :
1. Un sujet d'email accrocheur (max 60 caractères)
2. Le corps HTML de l'email (CSS inline, charte Hedjav)

Retourne au format :
SUJET: [le sujet]
---
[le HTML du body]`

  const result = await generateText({ prompt, system: SYSTEM, maxTokens: 2000 })

  if (!result.ok) {
    if (result.skipped) {
      // Pas de clé API → placeholder
      const placeholder = `<h1 style="font-family:Georgia,serif;font-size:24px;color:#1B2A4A;">Email #${position}</h1><p style="color:#1B2A4A;">${context ?? 'Contenu à générer'}</p>`
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      await db.from('campaign_emails').update({ body_html: placeholder }).eq('campaign_id', campaign_id).eq('position', position)
      return NextResponse.json({ subject: `Email #${position}`, preview: placeholder.substring(0, 200), placeholder: true })
    }
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  // Parse la réponse
  const text = result.text
  const parts = text.split('---')
  const subjectLine = (parts[0] ?? '').replace(/^SUJET:\s*/i, '').trim()
  const bodyHtml = (parts.slice(1).join('---') ?? '').trim()

  const subject = subjectLine || `Email #${position}`
  const html = bodyHtml || text

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  await db.from('campaign_emails').update({ subject, body_html: html }).eq('campaign_id', campaign_id).eq('position', position)

  return NextResponse.json({ subject, preview: html.substring(0, 200) })
}
