'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/lib/auth/actions'
import { COUNTRIES } from '@/lib/auth/countries'
import { AuthFormError } from './AuthFormError'

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

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
      <Field
        label="Mot de passe * (8 caractères min.)"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />

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

      <button type="submit" className="btn btn-gold btn-lg" disabled={pending}>
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
