'use client'

import { useTransition } from 'react'
import { updateCampaignStatus } from '@/lib/admin/campaign-actions'

const NEXT_STATUS: Record<string, 'active' | 'paused'> = {
  draft: 'active',
  active: 'paused',
  paused: 'active',
}

const LABELS: Record<string, string> = {
  draft: 'Activer',
  active: 'Pause',
  paused: 'Reprendre',
}

export function CampaignStatusButton({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition()
  const next = NEXT_STATUS[currentStatus]
  if (!next) return null

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { updateCampaignStatus(id, next) })}
      style={{
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: next === 'active' ? 'var(--admin-accent)' : 'rgba(255,255,255,.1)',
        color: next === 'active' ? '#0F1117' : 'var(--admin-text)',
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? '...' : LABELS[currentStatus]}
    </button>
  )
}
