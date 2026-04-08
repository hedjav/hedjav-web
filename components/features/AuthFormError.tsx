'use client'

export function AuthFormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      style={{
        marginBottom: 'var(--s4)',
        padding: 'var(--s3) var(--s4)',
        background: 'var(--err-bg)',
        border: '1px solid var(--err-bdr)',
        color: 'var(--err)',
        borderRadius: 'var(--r8)',
        fontSize: 'var(--text-sm)',
      }}
    >
      {message}
    </div>
  )
}
