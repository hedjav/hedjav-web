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
          Prêt à structurer votre patrimoine ?
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--muted)',
            maxWidth: 540,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
          }}
        >
          Commencez par nos guides essentiels — pensés pour l&apos;Afrique francophone.
        </p>
        <Link href="/ebooks" className="btn btn-gold btn-lg">
          Commencer maintenant
        </Link>
      </div>
    </section>
  )
}
