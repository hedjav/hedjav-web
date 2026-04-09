'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Props = {
  ebookId: string
  ebookTitle: string
  ebookPrice: number
  ebookSlug: string
}

export function BuyButton({ ebookId, ebookTitle, ebookPrice, ebookSlug }: Props) {
  const [state, setState] = useState<'loading' | 'guest' | 'purchased' | 'ready' | 'purchasing' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch(`/api/purchases/check?ebook_id=${ebookId}`)
        if (cancelled) return

        if (res.status === 401) {
          setState('guest')
          return
        }

        if (!res.ok) {
          setState('ready')
          return
        }

        const data = await res.json()
        setState(data.purchased ? 'purchased' : 'ready')
      } catch {
        setState('ready')
      }
    }

    check()
    return () => { cancelled = true }
  }, [ebookId])

  const formattedPrice = new Intl.NumberFormat('fr-FR').format(ebookPrice)

  async function handleBuy() {
    setState('purchasing')
    setErrorMsg('')

    try {
      const res = await fetch('/api/purchases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ebook_id: ebookId }),
      })

      if (res.status === 401) {
        window.location.href = `/login?next=/ebooks/${ebookSlug}`
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erreur lors de la création du paiement.')
        setState('error')
        return
      }

      if (data.payment_url) {
        window.location.href = data.payment_url
      } else {
        setErrorMsg('URL de paiement introuvable.')
        setState('error')
      }
    } catch {
      setErrorMsg('Erreur réseau. Veuillez réessayer.')
      setState('error')
    }
  }

  if (state === 'loading') {
    return (
      <button
        className="btn btn-lg btn-gold"
        disabled
        style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }}
      >
        Chargement...
      </button>
    )
  }

  if (state === 'purchased') {
    return (
      <Link
        href="/dashboard/mes-ebooks"
        className="btn btn-lg btn-gold"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Accéder à l'ebook
      </Link>
    )
  }

  if (state === 'guest') {
    return (
      <Link
        href={`/login?next=/ebooks/${ebookSlug}`}
        className="btn btn-lg btn-gold"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Acheter {formattedPrice} FCFA
      </Link>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <button
        className="btn btn-lg btn-gold"
        onClick={handleBuy}
        disabled={state === 'purchasing'}
        style={{ width: '100%', justifyContent: 'center', opacity: state === 'purchasing' ? 0.6 : 1 }}
      >
        {state === 'purchasing' ? 'Redirection vers FedaPay...' : `Acheter ${formattedPrice} FCFA`}
      </button>
      {(state === 'error') && errorMsg && (
        <p style={{ color: 'var(--error, #dc2626)', fontSize: 'var(--text-sm)', marginTop: 'var(--s2)', textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}
