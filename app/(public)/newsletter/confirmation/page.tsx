import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Inscription confirmée',
  robots: { index: false, follow: false },
}

export default function NewsletterConfirmationPage() {
  return (
    <section className="section">
      <div className="hedjav-container" style={{ maxWidth: 560, textAlign: 'center' }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 'var(--rfull)',
            background: 'var(--g100)',
            color: 'var(--g700)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--s8)',
          }}
          aria-hidden
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <span className="eyebrow">Confirmé</span>
        <h1
          className="h1"
          style={{
            marginTop: 'var(--s4)',
            fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))',
          }}
        >
          Vous êtes inscrit
        </h1>
        <p style={{ marginTop: 'var(--s5)', color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
          Merci pour votre confiance. Vous recevrez nos prochaines analyses
          dès leur publication.
        </p>
        <div style={{ marginTop: 'var(--s10)' }}>
          <Link href="/" className="btn btn-gold">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </section>
  )
}
