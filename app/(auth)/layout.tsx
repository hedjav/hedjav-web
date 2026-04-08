export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--s8) var(--s4)',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--surface)',
          borderRadius: 'var(--r24)',
          padding: 'var(--s10) var(--s8)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shc)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
