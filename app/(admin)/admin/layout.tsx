import { requireAdmin } from '@/lib/auth/session'
import { createClient } from '@supabase/supabase-js'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
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

  const sections = [
    {
      title: 'Overview',
      items: [
        { href: '/admin', label: 'Dashboard' },
      ],
    },
    {
      title: 'Contenu',
      items: [
        { href: '/admin/ebooks', label: 'Ebooks', badge: counts.ebooks },
        { href: '/admin/articles', label: 'Articles', badge: counts.articles },
      ],
    },
    {
      title: 'Commerce',
      items: [
        { href: '/admin/ventes', label: 'Ventes' },
        { href: '/admin/factures', label: 'Factures' },
        { href: '/admin/membres', label: 'Membres' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { href: '/admin/campagnes', label: 'Campagnes' },
        { href: '/admin/popup', label: 'Pop-up' },
      ],
    },
    {
      title: 'Outils',
      items: [
        { href: '/admin/ia', label: 'IA' },
        { href: '/admin/mediatheque', label: 'Mediatheque' },
        { href: '/admin/config', label: 'Configuration' },
      ],
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1628',
        color: '#E0E6EF',
        display: 'flex',
      }}
    >
      <AdminSidebar
        sections={sections}
        adminName={profile.full_name ?? profile.email}
        adminEmail={profile.email}
      />
      <main style={{ flex: 1, minWidth: 0, padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <AdminNotifications initialCount={unreadNotifs} />
        </div>
        {children}
      </main>
    </div>
  )
}
