'use client'

import { useState } from 'react'

type Props = {
  className?: string
  style?: React.CSSProperties
  redirectTo?: string
  label?: string
}

export function LogoutButton({
  className,
  style,
  redirectTo = '/',
  label = 'Se déconnecter',
}: Props) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      // Full reload pour forcer le re-render du Header (Server Component)
      window.location.href = redirectTo
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className}
      style={style}
    >
      {pending ? 'Déconnexion…' : label}
    </button>
  )
}
