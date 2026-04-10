'use client'

import { useTransition } from 'react'
import { deleteCampaignEmail } from '@/lib/admin/campaign-actions'

export function EmailDeleteButton({ emailId, campaignId }: { emailId: string; campaignId: string }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Supprimer cet email de la sequence ?')) return
    startTransition(() => { deleteCampaignEmail(emailId, campaignId) })
  }

  return (
    <button
      disabled={pending}
      onClick={handleDelete}
      style={{
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 6,
        border: '1px solid rgba(255,155,155,.3)',
        cursor: pending ? 'wait' : 'pointer',
        background: 'transparent',
        color: '#ff9b9b',
        opacity: pending ? 0.5 : 1,
        fontFamily: 'var(--fb)',
      }}
    >
      {pending ? '...' : 'Supprimer'}
    </button>
  )
}
