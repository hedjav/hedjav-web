'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePasswordAction } from '@/lib/auth/actions'
import { AuthFormError } from './AuthFormError'

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = await updatePasswordAction(fd)
          if (res.ok) router.push('/dashboard')
          else setError(res.error)
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
    >
      <AuthFormError message={error} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Nouveau mot de passe (8 caractères min.)
        </span>
        <input
          className="input"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <button type="submit" className="btn btn-gold btn-lg" disabled={pending}>
        {pending ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </form>
  )
}
