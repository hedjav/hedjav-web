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
        body: JSON.stringify({ email, source, type: 'editorial' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(j.error ?? 'Inscription impossible. Réessayez.')
        setStatus('error')
        return
      }
      if (j.alreadySubscribed) {
        setErrorMsg(null)
        setStatus('success')
        setEmail('')
        return
      }
      setStatus('success')
      setEmail('')
    } catch {
      setErrorMsg('Erreur réseau. Réessayez.')
      setStatus('error')
    }
  }

  // Style : la newsletter est dans une section navy fixe (NewsletterCTA),
  // donc on garde un input clair (cream) avec texte navy peu importe le thème.
  // C'est cohérent avec le design : la section reste navy en light comme en dark.
  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: '#F8F5EE', // cream fixe, lisible sur navy
    color: '#1B2A4A',       // navy fixe, lisible sur cream
    border: '1.5px solid rgba(255,255,255,.20)',
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
          style={inputStyle}
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
            color: '#F2DC8F',
            textAlign: 'center',
            marginTop: 'var(--s2)',
          }}
        >
          Merci ! Vérifiez votre boîte mail pour le message de bienvenue.
        </p>
      )}

      {status === 'error' && errorMsg && (
        <p
          role="alert"
          style={{
            fontSize: 'var(--text-sm)',
            color: '#ffb4b4',
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
