'use client'

import { useState, useTransition } from 'react'
import { updateCampaign } from '@/lib/admin/campaign-actions'

type Props = {
  id: string
  initialName: string
  initialType: string
  initialTags: string
}

export function CampaignEditForm({ id, initialName, initialType, initialTags }: Props) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState(initialType)
  const [tags, setTags] = useState(initialTags)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(false)
    const target_tags = tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    startTransition(async () => {
      await updateCampaign(id, { name, type, target_tags })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const inputStyle = {
    width: '100%',
    padding: 'var(--s2) var(--s3)',
    background: 'var(--admin-bg)',
    color: 'var(--admin-text)',
    border: '1px solid var(--admin-border)',
    borderRadius: 'var(--r8)',
    fontFamily: 'var(--fb)',
    fontSize: 'var(--text-sm)',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '11px',
    color: 'var(--admin-accent)',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '.1em',
  }

  return (
    <div style={{
      background: 'var(--admin-surface)',
      borderRadius: 'var(--r12)',
      padding: 'var(--s5)',
      border: '1px solid var(--admin-border)',
      marginBottom: 'var(--s8)',
    }}>
      <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--admin-text-muted)', fontWeight: 600, marginBottom: 'var(--s4)' }}>
        Modifier la campagne
      </h3>
      <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={labelStyle}>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            <option value="welcome_sequence">Bienvenue</option>
            <option value="promo">Promotion</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="custom">Personnalise</option>
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={labelStyle}>Tags cibles</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ia, brvm" style={inputStyle} />
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          style={{
            padding: 'var(--s2) var(--s4)',
            background: 'var(--admin-accent)',
            color: '#0F1117',
            border: 'none',
            borderRadius: 'var(--r8)',
            cursor: pending ? 'wait' : 'pointer',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--fb)',
            opacity: pending ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {pending ? '...' : 'Sauvegarder'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--admin-success)' }}>Enregistre</span>}
      </div>
    </div>
  )
}
