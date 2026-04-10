import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/claude/client'
import { logAiCall } from '@/lib/ai/log'

/**
 * POST /api/admin/generate-article
 * Body: { subject, category, instructions? }
 * Protected by admin session.
 * Generates an article via Claude API and saves as draft.
 */
export async function POST(request: Request) {
  // Verify admin session
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { subject?: string; category?: string; instructions?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.subject?.trim()) {
    return NextResponse.json({ error: 'Sujet requis' }, { status: 400 })
  }

  const subject = body.subject.trim()
  const category = body.category ?? 'Finance personnelle'
  const instructions = body.instructions?.trim() ?? ''

  const systemPrompt = `Tu es un redacteur expert en gestion de patrimoine et finance pour la zone UEMOA (Afrique de l'Ouest francophone).
Tu ecris des articles pour egp.hedjav.com, l'Ecole en ligne de la Gestion de Patrimoine.
Le public cible : investisseurs, epargnants et professionnels en zone UEMOA.
Monnaie : FCFA. Marche boursier : BRVM.

Ecris en francais. Structure avec des sous-titres markdown (##).
Inclus des exemples concrets adaptes a l'UEMOA.
L'article doit faire entre 800 et 1500 mots.

Retourne le contenu au format suivant :
TITRE: [titre de l'article]
EXTRAIT: [resume de 2 phrases maximum]
---
[corps de l'article en markdown]`

  const userPrompt = instructions
    ? `Sujet : ${subject}\nCategorie : ${category}\nInstructions supplementaires : ${instructions}`
    : `Sujet : ${subject}\nCategorie : ${category}`

  const start = Date.now()
  const result = await generateText({
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 4096,
  })
  const duration = Date.now() - start

  if (!result.ok) {
    await logAiCall({
      action: 'article_generation',
      prompt: userPrompt,
      status: 'error',
      error_message: result.error,
      duration_ms: duration,
      created_by: 'admin-generator',
    })
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  // Parse response
  const text = result.text
  const titleMatch = text.match(/TITRE:\s*(.+?)(?:\n|$)/)
  const excerptMatch = text.match(/EXTRAIT:\s*(.+?)(?:\n---|\n\n|$)/)
  const bodyStart = text.indexOf('---')
  const articleBody = bodyStart >= 0 ? text.substring(bodyStart + 3).trim() : text

  const title = titleMatch?.[1]?.trim() ?? subject
  const excerpt = excerptMatch?.[1]?.trim() ?? title

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await db.from('articles').insert({
    title,
    slug,
    body: articleBody,
    excerpt,
    category,
    source: 'ai',
    is_published: false,
    created_by: 'admin-generator',
    metadata: {
      generated_from: subject,
      instructions: instructions || null,
    },
  }).select('id, title, slug').single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  await logAiCall({
    action: 'article_generation',
    prompt: userPrompt,
    result: `Article cree: ${title} (${data.slug})`,
    status: 'success',
    duration_ms: duration,
    created_by: 'admin-generator',
  })

  return NextResponse.json({
    ok: true,
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt,
  })
}
