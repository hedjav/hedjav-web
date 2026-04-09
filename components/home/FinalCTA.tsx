import Link from 'next/link'

type FinalCTAProps = {
  title?: string
  subtitle?: string
}

export function FinalCTA({ title, subtitle }: FinalCTAProps = {}) {
  return (
    <section
      style={{
        paddingBlock: 'var(--s16)',
        background: 'var(--cta-bg)',
        borderTop: '1px solid var(--cta-border)',
        borderBottom: '1px solid var(--cta-border)',
        transition: 'background var(--ts), border-color var(--ts)',
      }}
    >
      <div className="hedjav-container" style={{ textAlign: 'center' }}>
        <h2
          className="h2"
          style={{ marginBottom: 'var(--s6)', color: 'var(--cta-title)' }}
        >
          {title ?? 'Prêt à bâtir votre patrimoine en UEMOA ?'}
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--cta-lead)',
            maxWidth: 600,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
          }}
        >
          {subtitle ?? "Découvrez nos ebooks pratiques, nos guides BRVM et nos premières formations en ligne \u2014 pensés et écrits pour l\u2019Afrique francophone."}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--s3)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/ebooks" className="btn btn-lg btn-gold">
            Voir les ebooks
          </Link>
          <Link
            href="/blog"
            className="btn btn-lg"
            style={{
              background: 'transparent',
              color: 'var(--cta-outline)',
              border: '1.5px solid var(--cta-outline)',
            }}
          >
            Lire le blog
          </Link>
        </div>
      </div>
    </section>
  )
}
