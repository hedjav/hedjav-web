import Link from 'next/link'

export function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        paddingBlock: 'clamp(var(--s16), 12vw, var(--s24))',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <div className="hedjav-container" style={{ position: 'relative', textAlign: 'center' }}>
        <span className="eyebrow">Gestion de patrimoine · Afrique francophone</span>

        <h1
          className="hedjav-hero-title"
          style={{
            fontFamily: 'var(--fd)',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.05,
            letterSpacing: '.01em',
            marginTop: 'var(--s5)',
            marginBottom: 'var(--s6)',
          }}
        >
          Bâtissez. Protégez.
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--g500)' }}>Transmettez.</em>
        </h1>

        <p
          style={{
            fontFamily: 'var(--fb)',
            fontSize: 'var(--text-lg)',
            lineHeight: 1.7,
            color: 'var(--muted)',
            maxWidth: 640,
            marginInline: 'auto',
            marginBottom: 'var(--s10)',
          }}
        >
          Hedjav accompagne particuliers et entrepreneurs d&apos;Afrique francophone
          dans la construction, la protection et la transmission d&apos;un patrimoine durable.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 'var(--s4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
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
