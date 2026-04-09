import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { markAsRead, markAllAsRead } from '@/lib/notifications/queries'

/**
 * POST /api/admin/notifications/read
 * Body: { id } or { all: true }
 * Protected by admin session.
 */
export async function POST(request: Request) {
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

  const body = await request.json()

  if (body.all) {
    await markAllAsRead()
  } else if (body.id) {
    await markAsRead(body.id)
  } else {
    return NextResponse.json({ error: 'id or all required' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
