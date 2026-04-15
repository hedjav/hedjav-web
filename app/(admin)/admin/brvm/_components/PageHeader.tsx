import Link from 'next/link'

type Crumb = { href?: string; label: string }

type Props = {
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  right?: React.ReactNode
}

export function PageHeader({ title, subtitle, crumbs, right }: Props) {
  return (
    <header style={{ marginBottom: 'var(--s6)' }}>
      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label="Fil d'Ariane"
          style={{
            fontSize: 12,
            color: 'var(--admin-text-muted)',
            marginBottom: 8,
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {crumbs.map((c, i) => (
            <span key={i}>
              {c.href ? (
                <Link
                  href={c.href}
                  style={{
                    color: 'var(--admin-text-muted)',
                    textDecoration: 'none',
                  }}
                >
                  {c.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--admin-text)' }}>{c.label}</span>
              )}
              {i < crumbs.length - 1 && (
                <span style={{ margin: '0 6px', opacity: 0.5 }}>/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'var(--text-4xl, 36px)',
              fontWeight: 600,
              color: 'var(--admin-text)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: 'var(--admin-text-muted)',
                fontSize: 14,
                marginTop: 8,
                maxWidth: 680,
                lineHeight: 1.55,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {right && <div style={{ flex: '0 0 auto' }}>{right}</div>}
      </div>
    </header>
  )
}
