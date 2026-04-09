'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/lib/auth/actions'
import { COUNTRIES } from '@/lib/auth/countries'
import { validatePassword, type PasswordStrength } from '@/lib/utils/validation'
import { AuthFormError } from './AuthFormError'

const strengthColors: Record<number, string> = {
  0: '#B91C1C',
  1: '#D97706',
  2: '#2563EB',
  3: '#16A34A',
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const pwCheck: PasswordStrength | null = password.length > 0 ? validatePassword(password) : null
  const passwordsMatch = password === passwordConfirm
  const canSubmit = !pending && (!pwCheck || pwCheck.isValid) && (passwordConfirm.length === 0 || passwordsMatch)

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--rfull)',
            background: 'var(--g100)',
            color: 'var(--g700)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--s5)',
          }}
          aria-hidden
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z" />
            <path d="m4 8 8 5 8-5" />
          </svg>
        </div>
        <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>Vérifiez votre email</h2>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Nous venons de vous envoyer un lien de confirmation. Cliquez dessus
          pour activer votre compte.
        </p>
      </div>
    )
  }

  return (
    <form
      action={(fd) => {
        if (!passwordsMatch) {
          setError('Les mots de passe ne correspondent pas')
          return
        }
        setError(null)
        startTransition(async () => {
          const res = await signUpAction(fd)
          if (res.ok) setSuccess(true)
          else setError(res.error)
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
    >
      <AuthFormError message={error} />

      <Field label="Nom complet *" name="full_name" type="text" autoComplete="name" required />
      <Field label="Email *" name="email" type="email" autoComplete="email" required />

      {/* Mot de passe avec eye toggle */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Mot de passe * (8 caractères min.)</span>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      {/* Barre de force */}
      {pwCheck && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i <= pwCheck.score - 1 ? strengthColors[pwCheck.score] : 'var(--border)',
                  transition: 'background .2s',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: strengthColors[pwCheck.score] }}>
            {pwCheck.label}
            {pwCheck.errors.length > 0 && ` — ${pwCheck.errors[0]}`}
          </span>
        </div>
      )}

      {/* Confirmation mot de passe */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Confirmez le mot de passe *</span>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showPasswordConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            aria-label={showPasswordConfirm ? 'Masquer' : 'Afficher'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--muted)',
            }}
          >
            {showPasswordConfirm ? (
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
        {passwordConfirm.length > 0 && !passwordsMatch && (
          <span style={{ fontSize: 'var(--text-xs)', color: '#B91C1C' }}>
            Les mots de passe ne correspondent pas
          </span>
        )}
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Pays *</span>
        <select className="input" name="country" defaultValue="BJ" required>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--s2)',
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
        }}
      >
        <input
          type="checkbox"
          name="newsletter_opt"
          defaultChecked
          style={{ marginTop: 4, accentColor: 'var(--g500)' }}
        />
        <span>Je souhaite recevoir la newsletter Hedjav (analyses BRVM, conseils patrimoine).</span>
      </label>

      <button type="submit" className="btn btn-gold btn-lg" disabled={!canSubmit}>
        {pending ? 'Création…' : 'Créer mon compte'}
      </button>

      <p
        style={{
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
          marginTop: 'var(--s2)',
        }}
      >
        Déjà inscrit ?{' '}
        <Link href="/login" style={{ color: 'var(--g700)', fontWeight: 600 }}>
          Se connecter
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
