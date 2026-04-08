'use client'

import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || status === 'loading') return
    setStatus('loading')
    // Stub UI — vraie intégration Brevo en couche 7
    await new Promise((r) => setTimeout(r, 600))
    setStatus('success')
    setEmail('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
        maxWidth: 480,
        marginInline: 'auto',
      }}
    >
      <div className="hedjav-newsletter-row">
        <input
          type="email"
          required
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'success'}
          aria-label="Adresse email"
          className="input"
          style={{ flex: 1, background: '#fff', color: 'var(--n900)' }}
        />
        <button
          type="submit"
          className="btn btn-gold"
          disabled={status === 'loading' || status === 'success'}
        >
          {status === 'loading' ? '…' : status === 'success' ? '✓ Inscrit' : "S'abonner"}
        </button>
      </div>

      {status === 'success' && (
        <p
          role="status"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--g300)',
            textAlign: 'center',
            marginTop: 'var(--s2)',
          }}
        >
          Merci ! Vous recevrez bientôt nos prochaines analyses.
        </p>
      )}

      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'rgba(255,255,255,.55)',
          textAlign: 'center',
          marginTop: 'var(--s2)',
        }}
      >
        Pas de spam. Désinscription en un clic. Vos données restent confidentielles.
      </p>
    </form>
  )
}
