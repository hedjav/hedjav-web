import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/features/ResetPasswordForm'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

export default function ResetPasswordPage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <h1 className="h2">Nouveau mot de passe</h1>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Choisissez un nouveau mot de passe sécurisé.
        </p>
      </div>
      <ResetPasswordForm />
    </>
  )
}
