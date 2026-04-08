import type { Metadata } from 'next'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/session'
import { ProfileForm } from '@/components/features/ProfileForm'
import { ChangePasswordForm } from '@/components/features/ChangePasswordForm'
import { LogoutButton } from '@/components/features/LogoutButton'
import type { Profile } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Mon profil' }

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()])

  const stub: Profile =
    profile ?? {
      id: user!.id,
      email: user!.email ?? '',
      full_name: (user!.user_metadata?.full_name as string) ?? null,
      country: (user!.user_metadata?.country as string) ?? 'BJ',
      phone: null,
      newsletter_opt: true,
      role: 'member',
      last_visit_at: null,
      metadata: {},
      created_at: user!.created_at,
      updated_at: user!.created_at,
    }

  return (
    <>
      <span className="eyebrow">Compte</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mon profil
      </h1>

      <section style={{ marginBottom: 'var(--s12)' }}>
        <h2
          className="h3"
          style={{
            marginBottom: 'var(--s5)',
            fontSize: 'var(--text-xl)',
            paddingBottom: 'var(--s2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Informations personnelles
        </h2>
        <ProfileForm profile={stub} />
      </section>

      <section style={{ marginBottom: 'var(--s12)' }}>
        <h2
          className="h3"
          style={{
            marginBottom: 'var(--s5)',
            fontSize: 'var(--text-xl)',
            paddingBottom: 'var(--s2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Sécurité
        </h2>
        <ChangePasswordForm />
      </section>

      <section>
        <h2
          className="h3"
          style={{
            marginBottom: 'var(--s5)',
            fontSize: 'var(--text-xl)',
            paddingBottom: 'var(--s2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Session
        </h2>
        <LogoutButton
          className="btn btn-outline"
          style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
        />
      </section>
    </>
  )
}
