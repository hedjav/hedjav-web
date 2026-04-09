'use client'

import { useTransition } from 'react'
import { addCampaignEmail } from '@/lib/admin/campaign-actions'

export function AddEmailForm({ campaignId, nextPosition }: { campaignId: string; nextPosition: number }) {
  const [pending, startTransition] = useTransition()

  const inputStyle = { padding: 'var(--s2) var(--s3)', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)' }

  return (
    <form
      action={(fd) => startTransition(() => { addCampaignEmail(fd) })}
      style={{ background: 'rgba(255,255,255,.03)', borderRadius: 'var(--r12)', padding: 'var(--s4)', display: 'flex', gap: 'var(--s3)', alignItems: 'flex-end', flexWrap: 'wrap' }}
    >
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="position" value={nextPosition} />

      <div style={{ flex: 2, minWidth: 200 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--admin-accent)', fontWeight: 600, textTransform: 'uppercase' }}>Sujet</label>
        <input name="subject" required placeholder="Sujet de l'email" style={{ ...inputStyle, width: '100%' }} />
      </div>

      <div style={{ flex: 0, minWidth: 80 }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--admin-accent)', fontWeight: 600, textTransform: 'uppercase' }}>Delai (j)</label>
        <input name="delay_days" type="number" min="0" defaultValue="0" style={{ ...inputStyle, width: '100%' }} />
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{ padding: 'var(--s2) var(--s4)', background: 'var(--admin-accent)', color: '#0F1117', border: 'none', borderRadius: 'var(--r8)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', opacity: pending ? 0.5 : 1 }}
      >
        {pending ? '...' : '+ Ajouter'}
      </button>
    </form>
  )
}
