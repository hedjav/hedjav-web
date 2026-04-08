'use client'

import { useState, useTransition } from 'react'
import { updatePasswordAction } from '@/lib/auth/actions'
import { AuthFormError } from './AuthFormError'

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        setSaved(false)
        const p1 = String(fd.get('password') ?? '')
        const p2 = String(fd.get('password_confirm') ?? '')
        if (p1.length < 8) {
          setError('Le mot de passe doit faire au moins 8 caractères.')
          return
        }
        if (p1 !== p2) {
          setError('Les deux mots de passe ne correspondent pas.')
          return
        }
        startTransition(async () => {
          const res = await updatePasswordAction(fd)
          if (res.ok) {
            setSaved(true)
            ;(document.getElementById('change-pw-form') as HTMLFormElement | null)?.reset()
          } else setError(res.error)
        })
      }}
      id="change-pw-form"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', maxWidth: 520 }}
    >
      <AuthFormError message={error} />
      {saved && (
        <div
          role="status"
          style={{
            padding: 'var(--s3) var(--s4)',
            background: 'var(--ok-bg)',
            border: '1px solid var(--ok-bdr)',
            color: 'var(--ok)',
            borderRadius: 'var(--r8)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Mot de passe mis à jour.
        </div>
      )}

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
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Confirmer</span>
        <input
          className="input"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <button
        type="submit"
        className="btn btn-outline"
        disabled={pending}
        style={{ alignSelf: 'flex-start' }}
      >
        {pending ? 'Mise à jour…' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}
