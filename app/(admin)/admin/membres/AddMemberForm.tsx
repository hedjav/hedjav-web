'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddMemberForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), full_name: fullName.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess(true)
        setEmail('')
        setFullName('')
        router.refresh()
        setTimeout(() => { setSuccess(false); setOpen(false) }, 2000)
      } else {
        setError(data.error ?? 'Erreur inconnue')
      }
    } catch {
      setError('Erreur reseau')
    }
    setSubmitting(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    color: 'var(--admin-text)',
    fontFamily: 'var(--fb)',
    fontSize: 13,
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    marginBottom: 4,
    fontSize: 11,
    color: 'var(--admin-accent)',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '.1em',
  }

  return (
    <div style={{ marginBottom: 'var(--s6)' }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'var(--admin-accent)',
            color: '#0F1117',
            padding: 'var(--s3) var(--s5)',
            borderRadius: 'var(--r8)',
            fontFamily: 'var(--fb)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Ajouter un membre
        </button>
      ) : (
        <div style={{
          background: 'var(--admin-surface)',
          borderRadius: 12,
          border: '1px solid var(--admin-border)',
          padding: 'var(--s5)',
          maxWidth: 500,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text)', marginBottom: 'var(--s4)' }}>
            Ajouter un membre admin
          </h3>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.12)',
              border: '1px solid rgba(239,68,68,.3)',
              color: '#ff9b9b',
              padding: 'var(--s2) var(--s3)',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 'var(--s4)',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(34,197,94,.12)',
              border: '1px solid rgba(34,197,94,.3)',
              color: 'var(--admin-success)',
              padding: 'var(--s2) var(--s3)',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 'var(--s4)',
            }}>
              Membre cree avec succes. Un email de confirmation a ete envoye.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="membre@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Nom complet</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} placeholder="Prenom Nom" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  background: submitting ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
                  color: '#0F1117',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: 'var(--fb)',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Creation...' : 'Creer le membre'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  background: 'transparent',
                  color: 'var(--admin-text-muted)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'var(--fb)',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
