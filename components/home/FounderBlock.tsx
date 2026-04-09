import Link from 'next/link'
import Image from 'next/image'

type FounderBlockProps = {
  bio?: string
  bullets?: string[]
}

export function FounderBlock({ bio, bullets }: FounderBlockProps = {}) {
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
            {bio ? (
              <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 'var(--s6)' }}>{bio}</p>
            ) : (
              <>
                <p
                  style={{
                    color: 'var(--muted)',
                    lineHeight: 1.8,
                    marginBottom: 'var(--s4)',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>
                    Analyste financier — 17 ans d&apos;expérience à Bank of Africa Bénin (BOA).
                  </strong>{' '}
                  Hermann a accompagné des centaines de cadres, entrepreneurs et
                  familles ouest-africaines sur des sujets de financement,
                  d&apos;investissement et de gestion de patrimoine.
                </p>
                <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 'var(--s4)' }}>
                  Aujourd&apos;hui à la tête de <strong style={{ color: 'var(--text)' }}>KTALYZ Conseils</strong>,
                  il dirige Hedjav — l&apos;école en ligne de la gestion de
                  patrimoine pour la zone UEMOA. Ebooks, formations BRVM, analyses
                  exclusives et outils patrimoniaux pour démocratiser une expertise
                  jusqu&apos;ici réservée à une élite.
                </p>
                <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: 'var(--s6)' }}>
                  Sa mission : ancrer la culture patrimoniale dans les réalités
                  fiscales (OHADA), économiques (BRVM, FCFA, UEMOA) et culturelles
                  du continent — par et pour les Africains francophones.
                </p>
              </>
            )}

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s2)',
                marginBottom: 'var(--s6)',
              }}
            >
              {(bullets ?? [
                '17 ans Bank of Africa Bénin (BOA)',
                'Fondateur KTALYZ Conseils — Cotonou',
                'Expert BRVM, fiscalité OHADA, structuration patrimoniale',
                "Auteur d'ebooks et de formations sur la finance UEMOA",
              ]).map((b) => (
                <Bullet key={b}>{b}</Bullet>
              ))}
            </ul>

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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
      <span style={{ color: 'var(--g500)', fontWeight: 700, flexShrink: 0 }}>✓</span>
      <span style={{ color: 'var(--text)' }}>{children}</span>
    </li>
  )
}
