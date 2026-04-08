import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getEbookBySlug } from '@/lib/ebooks/queries'
import { EbookPriceBlock } from '@/components/features/EbookPriceBlock'
import { EbookBuyButton } from '@/components/features/EbookBuyButton'
import { JsonLd, ebookJsonLd } from '@/components/features/JsonLd'

export const revalidate = 60

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const ebook = await getEbookBySlug(slug)
  if (!ebook) return { title: 'Ebook introuvable' }

  return {
    title: ebook.title,
    description: ebook.short_description,
    openGraph: {
      title: ebook.title,
      description: ebook.short_description,
      images: ebook.cover_image_url ? [{ url: ebook.cover_image_url }] : [],
    },
  }
}

export default async function EbookSalesPage({ params }: PageProps) {
  const { slug } = await params
  const ebook = await getEbookBySlug(slug)
  if (!ebook) notFound()

  return (
    <section className="section">
      <JsonLd data={ebookJsonLd(ebook)} />
      <div className="hedjav-container">
        <nav
          aria-label="Fil d’ariane"
          style={{ marginBottom: 'var(--s8)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}
        >
          <a href="/ebooks" style={{ color: 'var(--muted)' }}>
            ← Tous les ebooks
          </a>
        </nav>

        <div className="hedjav-grid-2" style={{ alignItems: 'start' }}>
          {/* Cover */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3 / 4',
              background: 'var(--n900)',
              borderRadius: 'var(--r24)',
              overflow: 'hidden',
              boxShadow: 'var(--shc)',
            }}
          >
            {ebook.cover_image_url ? (
              <Image
                src={ebook.cover_image_url}
                alt={ebook.title}
                fill
                sizes="(min-width: 900px) 40vw, 100vw"
                priority
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--s8)',
                  fontFamily: 'var(--fd)',
                  color: 'var(--g500)',
                  fontSize: 'var(--text-3xl)',
                  textAlign: 'center',
                }}
              >
                {ebook.title}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
            <span className="eyebrow">Ebook Hedjav</span>
            <h1 className="h1" style={{ fontSize: 'clamp(var(--text-3xl), 4.5vw, var(--text-5xl))' }}>
              {ebook.title}
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 'var(--text-lg)',
                lineHeight: 1.6,
              }}
            >
              {ebook.short_description}
            </p>

            <EbookPriceBlock price={ebook.price} originalPrice={ebook.original_price} size="lg" />

            <EbookBuyButton href={ebook.fedapay_link} size="lg" fullWidth />

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s3)',
                marginTop: 'var(--s2)',
              }}
            >
              {ebook.features.map((f) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    gap: 'var(--s3)',
                    alignItems: 'flex-start',
                    fontSize: 'var(--text-base)',
                  }}
                >
                  <span style={{ color: 'var(--g500)', fontWeight: 700, flexShrink: 0 }}>✔</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Trust block */}
            <div
              style={{
                marginTop: 'var(--s4)',
                padding: 'var(--s5)',
                background: 'var(--n50)',
                borderRadius: 'var(--r12)',
                fontSize: 'var(--text-sm)',
                color: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s2)',
              }}
            >
              <div>🔒 Paiement 100 % sécurisé via FedaPay (Wave, Orange Money, MTN MoMo, Carte bancaire)</div>
              <div>📥 Téléchargement immédiat après confirmation</div>
              <div>🇧🇯 Édité depuis Cotonou — support en français</div>
            </div>
          </div>
        </div>

        {/* Description longue */}
        <div style={{ marginTop: 'var(--s16)', maxWidth: 760, marginInline: 'auto' }}>
          <h2 className="h2" style={{ marginBottom: 'var(--s6)' }}>
            Ce que vous allez apprendre
          </h2>
          <div
            style={{
              fontSize: 'var(--text-base)',
              lineHeight: 1.75,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {ebook.description}
          </div>

          {ebook.target_audience.length > 0 && (
            <>
              <h2 className="h2" style={{ marginTop: 'var(--s12)', marginBottom: 'var(--s6)' }}>
                À qui s’adresse cet ebook ?
              </h2>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--s3)',
                }}
              >
                {ebook.target_audience.map((t) => (
                  <li
                    key={t}
                    style={{
                      display: 'flex',
                      gap: 'var(--s3)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: 'var(--g500)', fontWeight: 700 }}>•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 'var(--s10)', textAlign: 'center' }}>
            <EbookBuyButton href={ebook.fedapay_link} size="lg" />
          </div>
        </div>
      </div>
    </section>
  )
}
