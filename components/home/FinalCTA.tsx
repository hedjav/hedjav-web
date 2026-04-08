import Link from 'next/link'

// Couleurs fixes : la section conserve sa palette gold/cream peu importe le
// thème (light ou dark) — c'est un point chaud visuel de la home, on garde
// l'identité chaude originale.
const BG = 'linear-gradient(135deg, #FBF6E4 0%, #F8F5EE 100%)'
const TEXT = '#1B2A4A'
const MUTED = '#5C6F8F'
const BORDER = '#EFD99A'

export function FinalCTA() {
  return (
    <section
      style={{
        background: BG,
        paddingBlock: 'var(--s16)',
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div className="hedjav-container" style={{ textAlign: 'center' }}>
        <h2
          className="h2"
          style={{ marginBottom: 'var(--s6)', color: TEXT }}
        >
          Prêt à bâtir votre patrimoine en UEMOA ?
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: MUTED,
            maxWidth: 600,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
          }}
        >
          Découvrez nos ebooks pratiques, nos guides BRVM et nos premières
          formations en ligne — pensés et écrits pour l&apos;Afrique francophone.
        </p>
        <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/ebooks"
            className="btn btn-lg"
            style={{
              background: '#C5A028',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(197,160,40,.25)',
            }}
          >
            Voir les ebooks
          </Link>
          <Link
            href="/blog"
            className="btn btn-lg"
            style={{
              background: 'transparent',
              color: TEXT,
              border: `1.5px solid ${TEXT}`,
            }}
          >
            Lire le blog
          </Link>
        </div>
      </div>
    </section>
  )
}
