'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signInAction } from '@/lib/auth/actions'
import { AuthFormError } from './AuthFormError'

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

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

      {/* Mot de passe avec eye toggle */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mot de passe</span>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--muted)',
            }}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </label>

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
