import { createClient } from '@supabase/supabase-js'
import type { AdminNotification } from '@/lib/supabase/types'
import { resolveNotificationTarget } from './target-url'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export type CreateNotificationOptions = {
  metadata?: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  /** URL admin explicite (sinon déduite via resolveNotificationTarget). */
  target_url?: string | null
  entity_type?: string | null
  entity_id?: string | null
}

/**
 * Insère une notification admin.
 *
 * Signature historique (type, title, message, metadata) conservée par
 * rétro-compat (les call-sites de 2025 passent metadata en 4e arg).
 * Nouvelle signature préférée : passer un objet options pour target/entity.
 */
export async function createNotification(
  type: string,
  title: string,
  message?: string,
  metadataOrOptions?: Record<string, unknown> | CreateNotificationOptions,
) {
  const db = getDb()

  // Détection rétro-compat : si l'appelant passe directement un metadata,
  // on le normalise en options.
  let opts: CreateNotificationOptions = {}
  if (metadataOrOptions) {
    const maybe = metadataOrOptions as CreateNotificationOptions
    if ('metadata' in maybe || 'priority' in maybe || 'target_url' in maybe || 'entity_type' in maybe || 'entity_id' in maybe) {
      opts = maybe
    } else {
      opts = { metadata: metadataOrOptions as Record<string, unknown> }
    }
  }

  const target_url =
    opts.target_url ??
    resolveNotificationTarget({
      type,
      metadata: opts.metadata ?? null,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
    })

  const { error } = await db.from('admin_notifications').insert({
    type,
    title,
    message: message ?? null,
    metadata: opts.metadata ?? {},
    priority: opts.priority ?? 'normal',
    target_url,
    entity_type: opts.entity_type ?? null,
    entity_id: opts.entity_id ?? null,
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
