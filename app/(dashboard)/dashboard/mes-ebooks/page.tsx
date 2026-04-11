import type { Metadata } from 'next'
import { getCurrentUserPaidEbooksWithInvoices } from '@/lib/purchases/queries'
import { PurchasedEbookCard } from '@/components/features/PurchasedEbookCard'

export const metadata: Metadata = { title: 'Mes ebooks' }

const DOWNLOAD_ERROR_MESSAGES: Record<string, { title: string; message: string; retry: boolean }> = {
  missing_ebook_id: {
    title: 'Lien incomplet',
    message: "Le lien de téléchargement est incomplet. Revenez sur cette page et cliquez sur le bouton Télécharger de l'ebook concerné.",
    retry: true,
  },
  not_purchased: {
    title: 'Achat non reconnu',
    message: "Vous n'avez pas encore acheté cet ebook, ou votre paiement est encore en cours de validation. Patientez quelques minutes puis rafraîchissez cette page. Si le problème persiste, contactez-nous à hedjav@gmail.com avec votre email de paiement.",
    retry: true,
  },
  ebook_not_found: {
    title: 'Ebook introuvable',
    message: "L'ebook demandé n'existe plus dans notre catalogue. Contactez-nous à hedjav@gmail.com.",
    retry: false,
  },
  file_not_uploaded: {
    title: 'Fichier en cours de préparation',
    message: "Votre achat est bien enregistré mais le fichier PDF n'est pas encore disponible côté équipe Hedjav. Nous avons été notifiés et vous recevrez un email dès que c'est prêt (sous 24h maximum).",
    retry: false,
  },
  migration_missing: {
    title: 'Erreur technique côté serveur',
    message: "Le système de livraison est en cours de mise à jour. Contactez immédiatement hedjav@gmail.com en mentionnant 'migration 021'.",
    retry: false,
  },
  bucket_missing: {
    title: 'Erreur technique côté serveur',
    message: "Le système de stockage est temporairement indisponible. Contactez hedjav@gmail.com en mentionnant 'bucket ebook-files'.",
    retry: false,
  },
  file_missing_in_storage: {
    title: 'Fichier indisponible',
    message: "Le fichier référencé a été déplacé ou supprimé. L'équipe Hedjav a été notifiée. Contactez hedjav@gmail.com si urgent.",
    retry: false,
  },
  service_role_invalid: {
    title: 'Erreur de configuration serveur',
    message: "Le serveur ne peut pas accéder aux fichiers. Contactez hedjav@gmail.com en mentionnant 'service role'.",
    retry: false,
  },
  signed_url_failed: {
    title: 'Erreur génération du lien',
    message: "Impossible de générer le lien de téléchargement. Réessayez dans quelques instants ou contactez hedjav@gmail.com.",
    retry: true,
  },
  db_error: {
    title: 'Erreur base de données',
    message: "Erreur temporaire de la base de données. Réessayez dans quelques instants.",
    retry: true,
  },
}

type PageProps = {
  searchParams: Promise<{ download_error?: string; debug?: string }>
}

export default async function MesEbooksPage({ searchParams }: PageProps) {
  const { download_error: downloadError, debug } = await searchParams
  const items = await getCurrentUserPaidEbooksWithInvoices()
  const errorInfo = downloadError ? DOWNLOAD_ERROR_MESSAGES[downloadError] : null

  return (
    <>
      <span className="eyebrow">Bibliothèque</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mes ebooks
      </h1>

      {errorInfo && (
        <div
          style={{
            padding: 'var(--s5) var(--s6)',
            marginBottom: 'var(--s6)',
            background: 'rgba(231, 76, 60, 0.08)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 12,
            color: 'var(--text)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--fd)',
              fontSize: 18,
              fontWeight: 600,
              color: '#c0392b',
            }}
          >
            {errorInfo.title}
          </p>
          <p style={{ margin: 'var(--s3) 0 0', fontSize: 14, lineHeight: 1.6 }}>
            {errorInfo.message}
          </p>
          {errorInfo.retry && (
            <p style={{ margin: 'var(--s3) 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Après quelques instants, cliquez à nouveau sur Télécharger ci-dessous.
            </p>
          )}
          {debug && (
            <details style={{ marginTop: 'var(--s3)', fontSize: 12, color: 'var(--muted)' }}>
              <summary style={{ cursor: 'pointer' }}>Détails techniques (dev)</summary>
              <pre
                style={{
                  margin: 'var(--s2) 0 0',
                  padding: 'var(--s3)',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  overflow: 'auto',
                  fontSize: 11,
                }}
              >
                {debug}
              </pre>
            </details>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="hedjav-empty-state">
          <p style={{ color: 'var(--muted)' }}>Vous n&apos;avez pas encore acheté d&apos;ebook.</p>
          <a href="/ebooks" className="btn btn-gold" style={{ marginTop: 'var(--s5)' }}>
            Voir le catalogue
          </a>
        </div>
      ) : (
        <div className="hedjav-grid-3">
          {items.map(({ ebook, invoiceUrl, purchaseId }) => (
            <PurchasedEbookCard key={purchaseId} ebook={ebook} invoiceUrl={invoiceUrl} />
          ))}
        </div>
      )}
    </>
  )
}
