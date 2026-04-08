import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { countAdmins } from '@/lib/admin/setup'
import { getCurrentUser } from '@/lib/auth/session'
import { AdminSetupForm } from '@/components/features/AdminSetupForm'

export const metadata: Metadata = {
  title: 'Setup admin',
  robots: { index: false, follow: false },
}

export default async function AdminSetupPage() {
  // Si un admin existe déjà → 404 (la page disparaît à jamais)
  const adminCount = await countAdmins()
  if (adminCount > 0) notFound()

  // Si pas connecté → /login avec redirect
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin-setup')

  return (
    <section className="section">
      <div
        className="hedjav-container"
        style={{ maxWidth: 480 }}
      >
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--r24)',
            padding: 'var(--s10) var(--s8)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shc)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
            <span className="eyebrow">Bootstrap</span>
            <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
              Premier administrateur
            </h1>
            <p
              style={{
                marginTop: 'var(--s4)',
                color: 'var(--muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
              }}
            >
              Cette page n&apos;est accessible que tant qu&apos;aucun administrateur n&apos;existe.
              Saisissez le code <code style={{ color: 'var(--g700)', fontFamily: 'var(--fm)' }}>ADMIN_SETUP_CODE</code>{' '}
              défini dans votre <code style={{ color: 'var(--g700)', fontFamily: 'var(--fm)' }}>.env.local</code>{' '}
              pour devenir administrateur.
            </p>
            <p
              style={{
                marginTop: 'var(--s3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
              }}
            >
              Connecté en tant que <strong>{user.email}</strong>
            </p>
          </div>

          <AdminSetupForm />
        </div>
      </div>
    </section>
  )
}
