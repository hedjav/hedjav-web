import Link from 'next/link'

// La section adopte la palette chaude or/cream en light, et bascule sur une
// palette navy profonde en dark pour s'enchaîner harmonieusement avec le
// footer (--n950). Géré via la classe `.hedjav-final-cta` dans globals.css.
export function FinalCTA() {
  return (
    <section className="hedjav-final-cta">
      <div className="hedjav-container" style={{ textAlign: 'center' }}>
        <h2 className="h2 hedjav-final-cta__title">
          Prêt à bâtir votre patrimoine en UEMOA ?
        </h2>
        <p className="hedjav-final-cta__lead">
          Découvrez nos ebooks pratiques, nos guides BRVM et nos premières
          formations en ligne — pensés et écrits pour l&apos;Afrique francophone.
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
          <Link href="/blog" className="btn btn-lg hedjav-final-cta__outline">
            Lire le blog
          </Link>
        </div>
      </div>
    </section>
  )
}
