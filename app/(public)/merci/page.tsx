import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Merci pour votre achat',
  description: 'Votre paiement a bien été enregistré. Merci de votre confiance.',
  robots: { index: false, follow: false },
}

export default function MerciPage() {
  return (
    <section className="section">
      <div className="hedjav-container" style={{ maxWidth: 640, textAlign: 'center' }}>
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
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <span className="eyebrow">Confirmation</span>
        <h1 className="h1" style={{ marginTop: 'var(--s4)', fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))' }}>
          Merci pour votre confiance
        </h1>
        <p style={{ marginTop: 'var(--s5)', color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
          Votre paiement a bien été enregistré. Vous recevrez votre ebook par
          email dans quelques minutes.
        </p>

        <form
          style={{
            marginTop: 'var(--s10)',
            padding: 'var(--s8)',
            background: 'var(--surface)',
            borderRadius: 'var(--r16)',
            border: '1px solid var(--border)',
            textAlign: 'left',
          }}
        >
          <label
            htmlFor="confirmation-email"
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              marginBottom: 'var(--s2)',
            }}
          >
            Vérifier mon email
          </label>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--s4)' }}>
            Si vous n’avez pas reçu votre ebook sous 10 minutes, indiquez votre
            email ci-dessous et nous vous renvoyons le lien.
          </p>
          <div className="hedjav-newsletter-row">
            <input
              id="confirmation-email"
              type="email"
              className="input"
              placeholder="vous@email.com"
              required
              disabled
            />
            <button type="button" className="btn btn-primary" disabled>
              Renvoyer
            </button>
          </div>
          <p style={{ marginTop: 'var(--s3)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            (Disponible bientôt — en attendant, écrivez-nous à{' '}
            <a href="mailto:hedjav@gmail.com" style={{ color: 'var(--g700)' }}>
              hedjav@gmail.com
            </a>)
          </p>
        </form>

        <div style={{ marginTop: 'var(--s10)' }}>
          <a href="/ebooks" className="btn btn-outline">
            ← Retour au catalogue
          </a>
        </div>
      </div>
    </section>
  )
}
