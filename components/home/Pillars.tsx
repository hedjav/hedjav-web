const pillars = [
  {
    title: 'Apprendre',
    desc: "Ebooks pratiques, formations en ligne et analyses BRVM exclusives. Des contenus pensés pour la zone UEMOA, par des professionnels du marché ouest-africain.",
    path: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.42a12 12 0 0 1 .84 4.42 12 12 0 0 1-7 10.92A12 12 0 0 1 5 15a12 12 0 0 1 .84-4.42L12 14z',
  },
  {
    title: 'Investir',
    desc: "Ouvrir son compte titres, comprendre les indices BRVM 10 et BRVM Composite, sélectionner les bonnes valeurs. Notre méthode étape par étape pour faire travailler votre épargne dans l'UEMOA.",
    path: 'M3 3v18h18M7 14l4-4 4 4 5-5',
  },
  {
    title: 'Transmettre',
    desc: "Préparer la succession, structurer le patrimoine familial, former la génération suivante. Anticiper la transmission dans le cadre OHADA et au-delà des frontières.",
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
            Une école de la gestion de patrimoine pour l&apos;UEMOA
          </h2>
          <p
            style={{
              marginTop: 'var(--s5)',
              color: 'var(--muted)',
              maxWidth: 640,
              marginInline: 'auto',
              fontSize: 'var(--text-lg)',
            }}
          >
            Trois piliers pour bâtir, faire fructifier et transmettre votre
            patrimoine en zone UEMOA — sans dépendre des recettes occidentales
            hors-sol.
          </p>
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
