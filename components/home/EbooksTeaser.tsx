export function EbooksTeaser() {
  return (
    <section className="section" style={{ background: 'var(--surface)' }}>
      <div className="hedjav-container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--s10)' }}>
          <span className="eyebrow">Ebooks</span>
          <h2 className="h2" style={{ marginTop: 'var(--s4)' }}>
            Les guides essentiels
          </h2>
        </div>

        <div className="hedjav-empty-state">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--r16)',
              background: 'var(--g100)',
              color: 'var(--g700)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--s6)',
            }}
            aria-hidden
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 2H8a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 18H8a1 1 0 0 1 0-2h10v2zm0-4H8a3 3 0 0 0-1 .2V5a1 1 0 0 1 1-1h10v12z" />
            </svg>
          </div>
          <h3 className="h3" style={{ marginBottom: 'var(--s3)' }}>
            Catalogue en préparation
          </h3>
          <p style={{ color: 'var(--muted)', maxWidth: 520, marginInline: 'auto', marginBottom: 'var(--s6)' }}>
            Nos premiers ebooks sur la gestion de patrimoine en zone OHADA
            arrivent très bientôt. Inscrivez-vous à la newsletter pour être prévenu du lancement.
          </p>
          <a href="#newsletter" className="btn btn-outline">
            M&apos;inscrire à la newsletter
          </a>
        </div>
      </div>
    </section>
  )
}
