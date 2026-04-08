import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/features/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Mot de passe oublié' }

export default function ForgotPasswordPage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <h1 className="h2">Mot de passe oublié</h1>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Entrez votre email, nous vous enverrons un lien pour réinitialiser
          votre mot de passe.
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}
