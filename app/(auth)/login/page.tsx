import type { Metadata } from 'next'
import { LoginForm } from '@/components/features/LoginForm'

export const metadata: Metadata = { title: 'Connexion' }

type PageProps = { searchParams: Promise<{ next?: string }> }

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <span className="eyebrow">Espace membre</span>
        <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
          Bienvenue
        </h1>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Connectez-vous pour accéder à vos ebooks et votre dashboard.
        </p>
      </div>
      <LoginForm next={next} />
    </>
  )
}
