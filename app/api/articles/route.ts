import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/articles
 * Header : Authorization: Bearer <INTERNAL_API_TOKEN>
 * Body   : { title, slug?, excerpt, body, category, cover_image_url?,
 *            author?, published_at?, featured?, is_published?,
 *            created_by, source, quality_score? }
 *
 * Insère un article via service role (bypass RLS).
 * Idempotent : upsert sur slug.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  if (!process.env.INTERNAL_API_TOKEN || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const required = ['title', 'excerpt', 'body', 'category', 'created_by', 'source'] as const
  for (const k of required) {
    if (!payload[k] || typeof payload[k] !== 'string') {
      return NextResponse.json({ error: `Missing or invalid field: ${k}` }, { status: 400 })
    }
  }

  const source = payload.source as string
  if (source !== 'manual' && source !== 'ai') {
    return NextResponse.json({ error: 'source must be "manual" or "ai"' }, { status: 400 })
  }

  const slug =
    (payload.slug as string | undefined) ??
    (payload.title as string)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const row = {
    title: payload.title,
    slug,
    excerpt: payload.excerpt,
    body: payload.body,
    category: payload.category,
    cover_image_url: (payload.cover_image_url as string | null) ?? null,
    author: (payload.author as string | undefined) ?? 'Hermann D. AVAHOUIN',
    published_at: (payload.published_at as string | undefined) ?? null,
    featured: Boolean(payload.featured),
    is_published: Boolean(payload.is_published),
    created_by: payload.created_by,
    source,
    quality_score:
      typeof payload.quality_score === 'number' ? payload.quality_score : null,
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await supabase
    .from('articles')
    .upsert(row, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 })
}
