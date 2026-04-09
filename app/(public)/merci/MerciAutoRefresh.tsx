'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Auto-refresh la page /merci toutes les 5 secondes pendant 2 minutes max
 * pour vérifier si le webhook FedaPay a confirmé le paiement.
 * Arrête le refresh si le statut change (la page se recharge et ce composant
 * ne sera plus rendu car isPending sera false).
 */
export function MerciAutoRefresh() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const maxRetries = 24 // 24 × 5s = 2 minutes

  useEffect(() => {
    if (count >= maxRetries) return

    const timer = setTimeout(() => {
      setCount((c) => c + 1)
      router.refresh()
    }, 5000)

    return () => clearTimeout(timer)
  }, [count, maxRetries, router])

  if (count >= maxRetries) {
    return (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--s6)' }}>
        Le paiement prend plus de temps que prévu. Vérifiez votre email ou contactez-nous à hedjav@gmail.com.
      </p>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--s6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <div style={{
        width: 16, height: 16, border: '2px solid var(--g500)', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 1s linear infinite',
      }} />
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
        Vérification en cours... ({count}/{maxRetries})
      </span>
    </div>
  )
}
