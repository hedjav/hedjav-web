import type { Metadata } from 'next'
import { getCurrentUserPaidEbooks } from '@/lib/purchases/queries'
import { EbookCard } from '@/components/features/EbookCard'

export const metadata: Metadata = { title: 'Mes ebooks' }

export default async function MesEbooksPage() {
  const ebooks = await getCurrentUserPaidEbooks()

  return (
    <>
      <span className="eyebrow">Bibliothèque</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mes ebooks
      </h1>

      {ebooks.length === 0 ? (
        <div className="hedjav-empty-state">
          <p style={{ color: 'var(--muted)' }}>Vous n&apos;avez pas encore acheté d&apos;ebook.</p>
          <a href="/ebooks" className="btn btn-gold" style={{ marginTop: 'var(--s5)' }}>
            Voir le catalogue
          </a>
        </div>
      ) : (
        <div className="hedjav-grid-3">
          {ebooks.map((e) => (
            <EbookCard key={e.id} ebook={e} />
          ))}
        </div>
      )}
    </>
  )
}
