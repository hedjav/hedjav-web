import Image from 'next/image'
import type { Ebook } from '@/lib/supabase/types'

type Props = {
  ebook: Ebook
  invoiceUrl?: string | null
}

/**
 * Carte ebook AFFICHÉE sur /dashboard/mes-ebooks pour un ebook acheté.
 *
 * Différence clé avec `EbookCard` (public) :
 *  - Pas de lien vers la page de vente.
 *  - Bouton "Télécharger" qui POST /api/ebooks/download?ebook_id=XXX
 *  - Bouton "Facture" si invoice_url disponible.
 *  - Badge "Non disponible" si l'admin n'a pas encore uploadé le fichier.
 */
export function PurchasedEbookCard({ ebook, invoiceUrl }: Props) {
  const downloadUrl = `/api/ebooks/download?ebook_id=${ebook.id}`
  const hasFile = Boolean(ebook.file_path)

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          background: 'var(--n900)',
          overflow: 'hidden',
        }}
      >
        {ebook.cover_image_url ? (
          <Image
            src={ebook.cover_image_url}
            alt={ebook.title}
            fill
            sizes="(min-width: 900px) 33vw, (min-width: 700px) 50vw, 100vw"
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
              padding: 'var(--s6)',
              fontFamily: 'var(--fd)',
              color: 'var(--g500)',
              fontSize: 'var(--text-xl)',
              textAlign: 'center',
            }}
          >
            {ebook.title}
          </div>
        )}
        {/* Badge achat */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '4px 10px',
            background: 'var(--g500)',
            color: 'var(--n950)',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          Acheté
        </div>
      </div>

      <div
        style={{
          padding: 'var(--s6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s4)',
          flex: 1,
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            lineHeight: 1.2,
            color: 'var(--text)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}
        >
          {ebook.title}
        </h3>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
            margin: 0,
          }}
        >
          {ebook.short_description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          {hasFile ? (
            <a
              href={downloadUrl}
              className="btn btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Télécharger
            </a>
          ) : (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(231, 76, 60, 0.08)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--muted)',
                textAlign: 'center',
              }}
              title="Le fichier n'est pas encore disponible côté admin"
            >
              Disponible bientôt — contactez-nous si urgent
            </div>
          )}
          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 14px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--muted)',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              Voir la facture
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
