import type { Metadata } from 'next'
import { RegisterForm } from '@/components/features/RegisterForm'

export const metadata: Metadata = { title: 'Créer un compte' }

export default function RegisterPage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <span className="eyebrow">Inscription</span>
        <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
          Rejoindre Hedjav
        </h1>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Créez votre compte gratuit en moins d&apos;une minute.
        </p>
      </div>
      <RegisterForm />
    </>
  )
}
