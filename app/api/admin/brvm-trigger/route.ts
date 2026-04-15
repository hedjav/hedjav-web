import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Le scrape complet peut durer 3-6 min (4 univers × ~40 catégories).
// On aligne sur /api/brvm/scrape côté route cible.
export const maxDuration = 600

/**
 * POST /api/admin/brvm-trigger
 * Proxy pour /api/brvm/scrape (orchestrateur veille BRVM).
 * Protégé par session admin.
 */
export async function POST() {
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

  const token = process.env.INTERNAL_API_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'INTERNAL_API_TOKEN non configure' }, { status: 500 })
  }

  try {
    const res = await fetch(siteUrl('/api/brvm/scrape'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
