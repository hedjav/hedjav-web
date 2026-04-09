import type { Metadata } from 'next'
import { getAllNotifications } from '@/lib/notifications/queries'
import { NotificationsTable } from './NotificationsTable'

export const metadata: Metadata = { title: 'Admin — Notifications' }

export default async function AdminNotificationsPage() {
  const { notifications, total } = await getAllNotifications(1, 200)

  const rows = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message ?? '',
    priority: (n.metadata as Record<string, unknown>)?.priority as string ?? 'normal',
    is_read: n.is_read,
    created_at: n.created_at,
  }))

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 'var(--s8)' }}>
        Notifications ({total})
      </h1>
      <NotificationsTable rows={rows} />
    </>
  )
}
