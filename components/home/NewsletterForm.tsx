'use client'

import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

type Props = { source?: string; theme?: 'dark' | 'light' }

export function NewsletterForm({ source = 'home', theme = 'dark' }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || status === 'loading') return
    setStatus('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrorMsg(j.error ?? 'Inscription impossible. Réessayez.')
        setStatus('error')
        return
      }
      setStatus('success')
      setEmail('')
    } catch {
      setErrorMsg('Erreur réseau. Réessayez.')
      setStatus('error')
    }
  }

  const isDark = theme === 'dark'

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
            color: isDark ? 'var(--g300)' : 'var(--g700)',
            textAlign: 'center',
            marginTop: 'var(--s2)',
          }}
        >
          Merci ! Vérifiez votre email pour confirmer votre inscription.
        </p>
      )}

      {status === 'error' && errorMsg && (
        <p
          role="alert"
          style={{
            fontSize: 'var(--text-sm)',
            color: isDark ? '#ffb4b4' : 'var(--err)',
            textAlign: 'center',
            marginTop: 'var(--s2)',
          }}
        >
          {errorMsg}
        </p>
      )}

      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: isDark ? 'rgba(255,255,255,.55)' : 'var(--muted)',
          textAlign: 'center',
          marginTop: 'var(--s2)',
        }}
      >
        Pas de spam. Désinscription en un clic. Vos données restent confidentielles.
      </p>
    </form>
  )
}
