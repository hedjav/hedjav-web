'use client'

import { useState, useTransition } from 'react'
import { requestPasswordResetAction } from '@/lib/auth/actions'
import { AuthFormError } from './AuthFormError'

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  if (sent) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
        Si un compte existe avec cet email, vous recevrez un lien de
        réinitialisation dans quelques instants.
      </p>
    )
  }

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = await requestPasswordResetAction(fd)
          if (res.ok) setSent(true)
          else setError(res.error)
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
    >
      <AuthFormError message={error} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <button type="submit" className="btn btn-gold btn-lg" disabled={pending}>
        {pending ? 'Envoi…' : 'Recevoir le lien'}
      </button>
    </form>
  )
}
