'use client'

import { useState, useTransition } from 'react'
import { bootstrapAdminAction } from '@/lib/admin/setup'
import { AuthFormError } from './AuthFormError'

export function AdminSetupForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = await bootstrapAdminAction(fd)
          if (res && 'ok' in res && !res.ok) setError(res.error)
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
    >
      <AuthFormError message={error} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Code de bootstrap admin
        </span>
        <input
          className="input"
          name="code"
          type="text"
          autoComplete="off"
          required
          placeholder="Code fourni dans .env.local"
        />
      </label>
      <button type="submit" className="btn btn-gold btn-lg" disabled={pending}>
        {pending ? 'Vérification…' : 'Devenir administrateur'}
      </button>
    </form>
  )
}
