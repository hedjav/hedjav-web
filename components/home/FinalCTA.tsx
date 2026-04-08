import Link from 'next/link'

export function FinalCTA() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, var(--g50), var(--cream))',
        paddingBlock: 'var(--s16)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="hedjav-container" style={{ textAlign: 'center' }}>
        <h2 className="h2" style={{ marginBottom: 'var(--s6)' }}>
          Prêt à bâtir votre patrimoine en UEMOA ?
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--muted)',
            maxWidth: 600,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
          }}
        >
          Découvrez nos ebooks pratiques, nos guides BRVM et nos premières
          formations en ligne — pensés et écrits pour l&apos;Afrique francophone.
        </p>
        <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/ebooks" className="btn btn-gold btn-lg">
            Voir les ebooks
          </Link>
          <Link href="/blog" className="btn btn-outline btn-lg">
            Lire le blog
          </Link>
        </div>
      </div>
    </section>
  )
}
