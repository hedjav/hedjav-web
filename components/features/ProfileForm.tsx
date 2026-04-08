'use client'

import { useState, useTransition } from 'react'
import { updateProfileAction } from '@/lib/auth/actions'
import { COUNTRIES } from '@/lib/auth/countries'
import type { Profile } from '@/lib/supabase/types'
import { AuthFormError } from './AuthFormError'

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        setError(null)
        setSaved(false)
        startTransition(async () => {
          const res = await updateProfileAction(fd)
          if (res.ok) setSaved(true)
          else setError(res.error)
        })
      }}
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
          Profil mis à jour.
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Email</span>
        <input className="input" value={profile.email} disabled />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Nom complet</span>
        <input
          className="input"
          name="full_name"
          defaultValue={profile.full_name ?? ''}
          required
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Pays</span>
        <select className="input" name="country" defaultValue={profile.country ?? 'BJ'}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Téléphone</span>
        <input
          className="input"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ''}
          placeholder="+229 …"
        />
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
          defaultChecked={profile.newsletter_opt}
          style={{ marginTop: 4, accentColor: 'var(--g500)' }}
        />
        <span>Recevoir la newsletter Hedjav</span>
      </label>

      <button type="submit" className="btn btn-gold" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
