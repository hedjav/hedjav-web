import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes ebooks' }

export default function MesEbooksPage() {
  return (
    <>
      <span className="eyebrow">Bibliothèque</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mes ebooks
      </h1>
      <div className="hedjav-empty-state">
        <p style={{ color: 'var(--muted)' }}>Vous n&apos;avez pas encore acheté d&apos;ebook.</p>
        <a href="/ebooks" className="btn btn-gold" style={{ marginTop: 'var(--s5)' }}>
          Voir le catalogue
        </a>
      </div>
    </>
  )
}
