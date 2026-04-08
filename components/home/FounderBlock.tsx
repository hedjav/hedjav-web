import Link from 'next/link'

export function FounderBlock() {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="hedjav-container">
        <div className="hedjav-grid-2" style={{ alignItems: 'center', gap: 'var(--s12)' }}>
          {/* Portrait placeholder */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              aria-hidden
              style={{
                width: 240,
                height: 240,
                borderRadius: 'var(--rfull)',
                background: 'linear-gradient(135deg, var(--n900), var(--n700))',
                color: 'var(--g500)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--fd)',
                fontSize: 'var(--text-6xl)',
                fontWeight: 600,
                boxShadow: 'var(--shc)',
              }}
            >
              HA
            </div>
          </div>

          {/* Texte */}
          <div>
            <span className="eyebrow">Le fondateur</span>
            <h2 className="h2" style={{ marginTop: 'var(--s4)', marginBottom: 'var(--s5)' }}>
              Hermann D. AVAHOUIN
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 'var(--s4)' }}>
              Expert en gestion de patrimoine basé à Cotonou, Hermann accompagne
              depuis plus d&apos;une décennie particuliers, familles et entrepreneurs
              d&apos;Afrique francophone dans la structuration de leurs actifs.
            </p>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 'var(--s6)' }}>
              Sa mission avec Hedjav : démocratiser une expertise patrimoniale
              jusqu&apos;ici réservée à une élite, ancrée dans les réalités
              fiscales, économiques et culturelles du continent.
            </p>
            <Link
              href="/a-propos"
              style={{
                fontFamily: 'var(--fb)',
                fontWeight: 600,
                color: 'var(--g500)',
                fontSize: 'var(--text-sm)',
              }}
            >
              En savoir plus →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
