'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from '@/lib/admin/campaign-actions'

export default function NewCampaignPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSubmitting(true)
    const result = await createCampaign(formData)
    if (result.ok && result.id) {
      router.push(`/admin/campagnes/${result.id}`)
    } else if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', color: 'var(--admin-accent)', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '.1em' }
  const inputStyle = { width: '100%', padding: 'var(--s3) var(--s4)', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)' }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: 'var(--admin-text)', marginBottom: 'var(--s8)' }}>
        Nouvelle campagne
      </h1>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,.12)',
          border: '1px solid rgba(239,68,68,.3)',
          color: '#ff9b9b',
          padding: 'var(--s3) var(--s4)',
          borderRadius: 'var(--r8)',
          fontSize: 'var(--text-sm)',
          marginBottom: 'var(--s6)',
          maxWidth: 600,
        }}>
          {error}
        </div>
      )}

      <form action={handleSubmit} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <div>
          <label style={labelStyle}>Nom de la campagne</label>
          <input name="name" required style={inputStyle} placeholder="Ex : Bienvenue IA" />
        </div>

        <div>
          <label style={labelStyle}>Type</label>
          <select name="type" style={inputStyle}>
            <option value="welcome_sequence">Sequence de bienvenue</option>
            <option value="promo">Promotion</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="custom">Personnalise</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tags cibles (separes par des virgules, vide = tout le monde)</label>
          <input name="target_tags" style={inputStyle} placeholder="Ex : ia, brvm" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ alignSelf: 'flex-start', background: submitting ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)', color: '#0F1117', padding: 'var(--s3) var(--s6)', borderRadius: 'var(--r8)', border: 'none', cursor: submitting ? 'wait' : 'pointer', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          {submitting ? 'Creation...' : 'Creer la campagne'}
        </button>
      </form>
    </>
  )
}
