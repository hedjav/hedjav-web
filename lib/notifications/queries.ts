import { createClient } from '@supabase/supabase-js'
import type { AdminNotification } from '@/lib/supabase/types'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function createNotification(
  type: string,
  title: string,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  const db = getDb()
  const { error } = await db.from('admin_notifications').insert({
    type,
    title,
    message: message ?? null,
    metadata: metadata ?? {},
  })
  if (error) console.error('[notifications] insert failed', error)
}

export async function getUnreadCount(): Promise<number> {
  const db = getDb()
  const { count } = await db
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  return count ?? 0
}

export async function getRecentNotifications(limit = 20): Promise<AdminNotification[]> {
  const db = getDb()
  const { data } = await db
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as AdminNotification[]
}

export async function markAsRead(id: string) {
  const db = getDb()
  await db.from('admin_notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllAsRead() {
  const db = getDb()
  await db.from('admin_notifications').update({ is_read: true }).eq('is_read', false)
}

export async function getAllNotifications(
  page: number,
  limit: number,
): Promise<{ notifications: AdminNotification[]; total: number }> {
  const db = getDb()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count } = await db
    .from('admin_notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  return { notifications: (data ?? []) as AdminNotification[], total: count ?? 0 }
}
