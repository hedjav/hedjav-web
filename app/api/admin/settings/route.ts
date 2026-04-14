import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/settings?key=brvm_alert_frequencies
 * POST /api/admin/settings  { key, value }
 *
 * Table admin_settings (migration 026) : store clé/valeur admin-only.
 */

async function requireAdminSession() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') return null
  return profile as { id: string; role: string }
}

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(request: Request) {
  const profile = await requireAdminSession()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key manquant' }, { status: 400 })

  const db = adminDb()
  const { data, error } = await db
    .from('admin_settings')
    .select('key, value, updated_at')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    // Table absente (migration 026 pas appliquée) → renvoyer valeur null.
    return NextResponse.json({ ok: true, key, value: null })
  }
  return NextResponse.json({ ok: true, key, value: data?.value ?? null })
}

export async function POST(request: Request) {
  const profile = await requireAdminSession()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { key?: string; value?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  if (!body.key || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'key manquant' }, { status: 400 })
  }

  const db = adminDb()
  const { error } = await db.from('admin_settings').upsert(
    {
      key: body.key,
      value: body.value ?? {},
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
