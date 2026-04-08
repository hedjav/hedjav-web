import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { countAdmins } from '@/lib/admin/setup'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/session'
import { AdminSetupForm } from '@/components/features/AdminSetupForm'

export const metadata: Metadata = {
  title: 'Setup admin',
  robots: { index: false, follow: false },
}

export default async function AdminSetupPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin-setup')

  const profile = await getCurrentProfile()
  const adminCount = await countAdmins()
  const isCurrentUserAdmin = profile?.role === 'admin'

  // Si le user actuel est déjà admin → redirect vers /admin (pas la peine)
  if (isCurrentUserAdmin) redirect('/admin')

  // Si un autre admin existe déjà → afficher un message diagnostic au lieu de 404
  // pour permettre à l'utilisateur de comprendre la situation et utiliser
  // scripts/promote-admin.mjs en escape hatch.
  const blocked = adminCount > 0

  return (
    <section className="section">
      <div className="hedjav-container" style={{ maxWidth: 520 }}>
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
              {blocked ? 'Setup verrouillé' : 'Premier administrateur'}
            </h1>
            <p
              style={{
                marginTop: 'var(--s4)',
                color: 'var(--muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
              }}
            >
              {blocked ? (
                <>
                  Un administrateur existe déjà en base ({adminCount} admin
                  {adminCount > 1 ? 's' : ''}). La page de bootstrap est
                  verrouillée pour des raisons de sécurité.
                </>
              ) : (
                <>
                  Saisissez le code{' '}
                  <code style={{ color: 'var(--g700)', fontFamily: 'var(--fm)' }}>
                    ADMIN_SETUP_CODE
                  </code>{' '}
                  défini dans <code style={{ color: 'var(--g700)', fontFamily: 'var(--fm)' }}>.env.local</code>{' '}
                  pour devenir administrateur.
                </>
              )}
            </p>
            <p
              style={{
                marginTop: 'var(--s3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
              }}
            >
              Connecté en tant que <strong>{user.email}</strong>{' '}
              {profile && <>(rôle : <strong>{profile.role}</strong>)</>}
            </p>
          </div>

          {blocked ? (
            <div
              style={{
                padding: 'var(--s5)',
                background: 'var(--n50)',
                borderRadius: 'var(--r12)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.7,
                color: 'var(--text)',
              }}
            >
              <p style={{ marginBottom: 'var(--s4)', fontWeight: 600 }}>
                Pour vous donner l&apos;accès admin, deux options :
              </p>
              <ol style={{ paddingLeft: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <li>
                  <strong>Promotion via script</strong> (recommandé) — depuis votre terminal&nbsp;:
                  <pre
                    style={{
                      marginTop: 'var(--s2)',
                      padding: 'var(--s3) var(--s4)',
                      background: 'var(--n950)',
                      color: '#E0E6EF',
                      borderRadius: 'var(--r8)',
                      fontFamily: 'var(--fm)',
                      fontSize: 'var(--text-xs)',
                      overflow: 'auto',
                    }}
                  >
{`node scripts/promote-admin.mjs ${user.email}`}
                  </pre>
                </li>
                <li>
                  <strong>SQL direct dans Supabase</strong> :
                  <pre
                    style={{
                      marginTop: 'var(--s2)',
                      padding: 'var(--s3) var(--s4)',
                      background: 'var(--n950)',
                      color: '#E0E6EF',
                      borderRadius: 'var(--r8)',
                      fontFamily: 'var(--fm)',
                      fontSize: 'var(--text-xs)',
                      overflow: 'auto',
                    }}
                  >
{`update profiles
set role='admin'
where email='${user.email}';`}
                  </pre>
                </li>
              </ol>
              <p
                style={{
                  marginTop: 'var(--s5)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--muted)',
                }}
              >
                Pour vérifier qui est admin actuellement :
                <br />
                <code style={{ fontFamily: 'var(--fm)' }}>node scripts/list-admins.mjs</code>
              </p>
              <p
                style={{
                  marginTop: 'var(--s4)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--muted)',
                }}
              >
                Après promotion, déconnectez-vous puis reconnectez-vous pour
                rafraîchir votre session.
              </p>
            </div>
          ) : (
            <AdminSetupForm />
          )}
        </div>
      </div>
    </section>
  )
}
