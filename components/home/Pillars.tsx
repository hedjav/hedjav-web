const pillars = [
  {
    title: 'Conseil indépendant',
    desc: "Aucune commission cachée, aucun produit imposé. Notre seul mandat : votre intérêt patrimonial à long terme.",
    path: 'M12 2 4 6v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4zm0 4 5 2.5v3.7c0 3.6-2.4 6.9-5 7.8-2.6-.9-5-4.2-5-7.8V8.5L12 6z',
  },
  {
    title: 'Ancrage local',
    desc: "Fiscalité OHADA, BRVM, immobilier béninois, succession francophone. L'Afrique pensée par des Africains.",
    path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 18.9A8 8 0 0 1 4 13h3a13 13 0 0 0 4 7.9zm2 0A13 13 0 0 0 17 13h3a8 8 0 0 1-7 7.9zm-2-15.8A13 13 0 0 0 7 11H4a8 8 0 0 1 7-7.9zm2 0A8 8 0 0 1 20 11h-3a13 13 0 0 0-4-5.9z',
  },
  {
    title: 'Transmission',
    desc: "Préparez la succession, structurez le patrimoine familial, formez la génération suivante. Penser au-delà de soi.",
    path: 'M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4zm8 0a9 9 0 0 0-1.8.2A5.4 5.4 0 0 1 18 17v3h6v-3c0-2.7-5.3-4-8-4z',
  },
]

export function Pillars() {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="hedjav-container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--s12)' }}>
          <span className="eyebrow">Notre approche</span>
          <h2 className="h2" style={{ marginTop: 'var(--s4)' }}>
            Le patrimoine pensé pour l&apos;Afrique
          </h2>
        </div>

        <div className="hedjav-grid-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="card"
              style={{
                padding: 'var(--s8)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s4)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--r12)',
                  background: 'var(--g100)',
                  color: 'var(--g700)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d={p.path} />
                </svg>
              </div>
              <h3 className="h3" style={{ fontSize: 'var(--text-2xl)' }}>
                {p.title}
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{p.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
