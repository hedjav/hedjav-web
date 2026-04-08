import Link from 'next/link'
import Image from 'next/image'

export function FounderBlock() {
  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="hedjav-container">
        <div className="hedjav-grid-2" style={{ alignItems: 'center', gap: 'var(--s12)' }}>
          {/* Portrait Hermann */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: 280,
                height: 280,
                borderRadius: 'var(--rfull)',
                overflow: 'hidden',
                boxShadow: 'var(--shc)',
                border: '4px solid var(--g500)',
              }}
            >
              <Image
                src="/DSC_0010 copy.jpeg"
                alt="Hermann D. AVAHOUIN, fondateur de Hedjav"
                fill
                sizes="280px"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                priority
              />
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
