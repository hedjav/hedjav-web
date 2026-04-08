import type { Metadata } from 'next'
import { getPublishedEbooks } from '@/lib/ebooks/queries'
import { EbookCard } from '@/components/features/EbookCard'

export const metadata: Metadata = {
  title: 'Ebooks — Guides patrimoine et finance Afrique',
  description:
    'Le catalogue complet des ebooks Hedjav : IA, BRVM, gestion de patrimoine et finances personnelles pour l’Afrique francophone.',
}

export const revalidate = 60

export default async function EbooksPage() {
  const ebooks = await getPublishedEbooks()

  return (
    <>
      <section className="section-sm" style={{ background: 'var(--surface)' }}>
        <div className="hedjav-container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Catalogue</span>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s4)',
              fontSize: 'clamp(var(--text-4xl), 6vw, var(--text-5xl))',
            }}
          >
            Les ebooks Hedjav
          </h1>
          <p
            style={{
              marginTop: 'var(--s5)',
              color: 'var(--muted)',
              maxWidth: 640,
              marginInline: 'auto',
              fontSize: 'var(--text-lg)',
            }}
          >
            Des guides pratiques, conçus pour passer à l’action immédiatement et
            bâtir un patrimoine solide en Afrique francophone.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="hedjav-container">
          {ebooks.length === 0 ? (
            <div className="hedjav-empty-state">
              <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>
                Catalogue en préparation
              </h2>
              <p style={{ color: 'var(--muted)' }}>
                Les premiers titres seront publiés très bientôt.
              </p>
            </div>
          ) : (
            <div className="hedjav-grid-3">
              {ebooks.map((ebook) => (
                <EbookCard key={ebook.id} ebook={ebook} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
