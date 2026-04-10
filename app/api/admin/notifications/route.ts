import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRecentNotifications, getUnreadCount } from '@/lib/notifications/queries'

/**
 * GET /api/admin/notifications
 * Protected by admin session.
 */
export async function GET() {
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

  const [notifications, unread_count] = await Promise.all([
    getRecentNotifications(20),
    getUnreadCount(),
  ])

  return NextResponse.json(
    { notifications, unread_count },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  )
}
