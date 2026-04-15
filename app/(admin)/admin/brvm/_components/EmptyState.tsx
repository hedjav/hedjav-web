import Link from 'next/link'

type Props = {
  title?: string
  message?: string
  cta?: { href: string; label: string }
}

/**
 * État vide éditorial et rassurant. Jamais d'emoji, jamais de ton sec.
 * Utilisé partout où un tableau peut être vide (période vide, catégorie neuve).
 */
export function EmptyState({
  title = 'Rien à afficher pour l’instant',
  message = 'Aucun élément ne correspond aux filtres actuels. Essayez d’élargir la période ou de relancer la veille.',
  cta,
}: Props) {
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px dashed var(--admin-border)',
        borderRadius: 12,
        padding: '48px var(--s5)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: 'var(--admin-text-muted)',
          fontSize: 13.5,
          maxWidth: 480,
          margin: '0 auto',
          lineHeight: 1.55,
        }}
      >
        {message}
      </p>
      {cta && (
        <Link
          href={cta.href}
          style={{
            display: 'inline-block',
            marginTop: 'var(--s5)',
            padding: '10px 22px',
            borderRadius: 999,
            background: 'var(--admin-accent, #C5A028)',
            color: '#0D1628',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
