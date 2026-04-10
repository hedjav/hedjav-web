'use client'

import { useTransition } from 'react'
import { promoteUserAction, demoteUserAction } from '@/lib/admin/setup'

type Props = {
  userId: string
  isAdmin: boolean
  userName: string
}

export function MemberRoleButtons({ userId, isAdmin, userName }: Props) {
  const [pending, startTransition] = useTransition()

  function handlePromote() {
    if (!confirm(`Promouvoir "${userName}" en administrateur ?`)) return
    const fd = new FormData()
    fd.set('user_id', userId)
    startTransition(() => { promoteUserAction(fd) })
  }

  function handleDemote() {
    if (!confirm(`Retrograder "${userName}" en simple membre ? Il perdra l'acces admin.`)) return
    const fd = new FormData()
    fd.set('user_id', userId)
    startTransition(() => { demoteUserAction(fd) })
  }

  if (isAdmin) {
    return (
      <button
        disabled={pending}
        onClick={handleDemote}
        style={{
          padding: '10px 20px',
          background: 'transparent',
          color: '#ff9b9b',
          border: '2px solid rgba(255,155,155,.4)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: pending ? 'wait' : 'pointer',
          fontFamily: 'var(--fb)',
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? 'Retrogradation...' : 'Retrograder en membre'}
      </button>
    )
  }

  return (
    <button
      disabled={pending}
      onClick={handlePromote}
      style={{
        padding: '10px 20px',
        background: 'var(--admin-accent)',
        color: '#0F1117',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: pending ? 'wait' : 'pointer',
        fontFamily: 'var(--fb)',
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? 'Promotion...' : 'Promouvoir admin'}
    </button>
  )
}
