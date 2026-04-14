import type { Metadata } from 'next'
import { LoginForm } from '@/components/features/LoginForm'

export const metadata: Metadata = { title: 'Connexion' }

type PageProps = { searchParams: Promise<{ next?: string; expired?: string }> }

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, expired } = await searchParams
  const sessionExpired = expired === '1'

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s8)' }}>
        <span className="eyebrow">Espace membre</span>
        <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
          {sessionExpired ? 'Session expirée' : 'Bienvenue'}
        </h1>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          {sessionExpired
            ? 'Par sécurité, votre session a été fermée suite à une période d\u2019inactivité. Reconnectez-vous pour continuer.'
            : 'Connectez-vous pour accéder à vos ebooks et votre dashboard.'}
        </p>
      </div>
      {sessionExpired && (
        <div
          role="alert"
          style={{
            margin: '0 auto var(--s6)',
            maxWidth: 420,
            padding: '10px 14px',
            background: 'rgba(197,160,40,.08)',
            border: '1px solid rgba(197,160,40,.3)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text)',
          }}
        >
          Vos données sont conservées. Votre dernière page sera restaurée après reconnexion.
        </div>
      )}
      <LoginForm next={next} />
    </>
  )
}
