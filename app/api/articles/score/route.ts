import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/ai/client'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const SCORING_PROMPT = `Score cet article de 0 a 100 sur 5 criteres :
- Pertinence UEMOA (0-20)
- Qualite redactionnelle (0-20)
- SEO (0-20)
- Donnees chiffrees (0-20)
- Appel a l'action (0-20)

Retourne UNIQUEMENT un nombre entier entre 0 et 100.`

async function scoreArticle(articleId: string): Promise<{ id: string; score: number } | null> {
  const db = adminDb()
  const { data: article } = await db
    .from('articles')
    .select('id, title, body, category')
    .eq('id', articleId)
    .maybeSingle()

  if (!article) return null

  const result = await generateText({
    system: SCORING_PROMPT,
    prompt: `Titre: ${article.title}\nCategorie: ${article.category}\n\nContenu:\n${(article.body as string).substring(0, 3000)}`,
    maxTokens: 32,
    temperature: 0.2,
    action: 'article_scoring',
  })

  if (!result.ok) return null

  // Parse integer from response
  const match = result.text.match(/\d+/)
  const score = match ? Math.min(100, Math.max(0, parseInt(match[0], 10))) : null
  if (score == null) return null

  await db.from('articles').update({ quality_score: score }).eq('id', articleId)
  return { id: articleId, score }
}

/**
 * POST /api/articles/score
 * Body: { article_id } or { all: true }
 * Protected by admin session.
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

  let body: { article_id?: string; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.all) {
    const db = adminDb()
    const { data: articles } = await db
      .from('articles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(50)

    const results: Array<{ id: string; score: number }> = []
    for (const a of articles ?? []) {
      const result = await scoreArticle(a.id as string)
      if (result) results.push(result)
    }

    return NextResponse.json({ ok: true, results, scored: results.length })
  }

  if (body.article_id) {
    const result = await scoreArticle(body.article_id)
    if (!result) {
      return NextResponse.json({ ok: false, error: 'Scoring echoue' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, score: result.score })
  }

  return NextResponse.json({ error: 'article_id or all required' }, { status: 400 })
}
