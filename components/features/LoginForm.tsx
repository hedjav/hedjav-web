'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signInAction } from '@/lib/auth/actions'
import { AuthFormError } from './AuthFormError'

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = await signInAction(fd)
          if (res && 'ok' in res && !res.ok) setError(res.error)
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
    >
      {next && <input type="hidden" name="next" value={next} />}
      <AuthFormError message={error} />

      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <div style={{ textAlign: 'right' }}>
        <Link
          href="/forgot-password"
          style={{ color: 'var(--g700)', fontSize: 'var(--text-sm)' }}
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <button type="submit" className="btn btn-gold btn-lg" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>

      <p
        style={{
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
          marginTop: 'var(--s2)',
        }}
      >
        Pas encore de compte ?{' '}
        <Link href="/register" style={{ color: 'var(--g700)', fontWeight: 600 }}>
          Créer un compte
        </Link>
      </p>
    </form>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, name, ...rest } = props
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{label}</span>
      <input className="input" name={name} {...rest} />
    </label>
  )
}
