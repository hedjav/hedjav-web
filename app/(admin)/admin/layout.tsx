import { requireAdmin } from '@/lib/auth/session'
import { createClient } from '@supabase/supabase-js'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { getUnreadCount } from '@/lib/notifications/queries'

async function getCounts() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const [ebooks, articles] = await Promise.all([
    db.from('ebooks').select('id', { count: 'exact', head: true }),
    db.from('articles').select('id', { count: 'exact', head: true }),
  ])
  return { ebooks: ebooks.count ?? 0, articles: articles.count ?? 0 }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  const [counts, unreadNotifs] = await Promise.all([getCounts(), getUnreadCount()])

  const adminName = profile.full_name ?? profile.email
  const adminEmail = profile.email

  return (
    <div
      data-admin
      style={{
        minHeight: '100vh',
        background: 'var(--admin-bg)',
        color: 'var(--admin-text)',
        display: 'flex',
      }}
    >
      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        ebookCount={counts.ebooks}
        articleCount={counts.articles}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader
          adminName={adminName}
          initialUnread={unreadNotifs}
        />
        <main style={{ flex: 1, padding: '24px 40px 40px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
