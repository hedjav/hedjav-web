export function BlogTeaser() {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="hedjav-container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--s10)' }}>
          <span className="eyebrow">Blog</span>
          <h2 className="h2" style={{ marginTop: 'var(--s4)' }}>
            Nos analyses
          </h2>
        </div>

        <div className="hedjav-empty-state">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--r16)',
              background: 'var(--n100)',
              color: 'var(--n700)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--s6)',
            }}
            aria-hidden
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM7 17H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V7h2v2zm12 8H9v-2h10v2zm0-4H9v-2h10v2zm0-4H9V7h10v2z" />
            </svg>
          </div>
          <h3 className="h3" style={{ marginBottom: 'var(--s3)' }}>
            Premières analyses très bientôt
          </h3>
          <p style={{ color: 'var(--muted)', maxWidth: 520, marginInline: 'auto', marginBottom: 'var(--s6)' }}>
            Décryptages BRVM, conseils patrimoniaux et études de cas
            publiés chaque semaine. Soyez parmi les premiers lecteurs.
          </p>
          <a href="#newsletter" className="btn btn-outline">
            Être prévenu
          </a>
        </div>
      </div>
    </section>
  )
}
