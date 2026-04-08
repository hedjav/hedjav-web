import type { Metadata } from 'next'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/session'
import { ProfileForm } from '@/components/features/ProfileForm'
import type { Profile } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Mon profil' }

export default async function ProfilePage() {
  // Le layout (dashboard) appelle déjà requireUser() — donc on a forcément un user ici.
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()])

  // Si le profil n'existe pas (trigger handle_new_user pas exécuté, ex: user
  // créé avant la migration 003), on construit un profil stub à partir des
  // données de auth.users. L'upsert dans updateProfileAction le créera.
  const stub: Profile =
    profile ?? {
      id: user!.id,
      email: user!.email ?? '',
      full_name: (user!.user_metadata?.full_name as string) ?? null,
      country: (user!.user_metadata?.country as string) ?? 'BJ',
      phone: null,
      newsletter_opt: true,
      role: 'member',
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
      <ProfileForm profile={stub} />
    </>
  )
}
