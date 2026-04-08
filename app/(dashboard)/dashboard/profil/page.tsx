import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/session'
import { ProfileForm } from '@/components/features/ProfileForm'

export const metadata: Metadata = { title: 'Mon profil' }

export default async function ProfilePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  return (
    <>
      <span className="eyebrow">Compte</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mon profil
      </h1>
      <ProfileForm profile={profile} />
    </>
  )
}
