import type { Metadata } from 'next'
import {
  getCurrentUserPaidEbooksWithInvoices,
  getCurrentUserPendingPurchases,
} from '@/lib/purchases/queries'
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

function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export default async function MesEbooksPage({ searchParams }: PageProps) {
  const { download_error: downloadError, debug } = await searchParams
  const [paidItems, pendingItems] = await Promise.all([
    getCurrentUserPaidEbooksWithInvoices(),
    getCurrentUserPendingPurchases(),
  ])
  const errorInfo = downloadError ? DOWNLOAD_ERROR_MESSAGES[downloadError] : null

  // Sépare les achats où l'ebook est disponible de ceux où il a été supprimé/dépublié
  const availableItems = paidItems.filter((item) => item.ebook !== null)
  const orphanItems = paidItems.filter((item) => item.ebook === null)

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
              <summary style={{ cursor: 'pointer' }}>Détails techniques</summary>
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

      {/* Section : commandes en attente (paiement non confirmé) */}
      {pendingItems.length > 0 && (
        <div
          style={{
            padding: 'var(--s5) var(--s6)',
            marginBottom: 'var(--s6)',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--s3)',
              fontFamily: 'var(--fd)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Commandes en attente de validation
          </h2>
          <p style={{ margin: '0 0 var(--s4)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Le(s) ebook(s) ci-dessous ont une commande initiée dont le paiement
            n&apos;a pas encore été confirmé par FedaPay.
            <br />
            <strong>Si vous avez déjà payé et été débité</strong>, contactez-nous à{' '}
            <a href="mailto:hedjav@gmail.com" style={{ color: 'var(--g500)' }}>
              hedjav@gmail.com
            </a>{' '}
            avec la référence ci-dessous, nous débloquons votre accès en moins de 24h.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingItems.map((p) => (
              <div
                key={p.purchaseId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: 'var(--s4)',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: 8,
                  fontSize: 13,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.ebookTitle}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {formatAmount(p.amount)} FCFA · tentative du{' '}
                    {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {p.otherAttemptsCount > 0 && (
                    <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                      {p.otherAttemptsCount} autre
                      {p.otherAttemptsCount > 1 ? 's' : ''} tentative
                      {p.otherAttemptsCount > 1 ? 's' : ''} pour cet ebook
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontFamily: 'var(--fm)',
                    textAlign: 'right',
                  }}
                >
                  Ref : <strong>{p.paymentRef || '(aucune)'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section : achats orphelins (ebook supprimé/dépublié) */}
      {orphanItems.length > 0 && (
        <div
          style={{
            padding: 'var(--s5) var(--s6)',
            marginBottom: 'var(--s6)',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 12,
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--s3)',
              fontFamily: 'var(--fd)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Achats en attente de fichier
          </h2>
          <p style={{ margin: '0 0 var(--s4)', fontSize: 13, color: 'var(--muted)' }}>
            Vous avez bien acheté le(s) ebook(s) suivant(s) mais le fichier n&apos;est
            pas encore disponible dans notre catalogue. Contactez-nous à{' '}
            <a href="mailto:hedjav@gmail.com" style={{ color: 'var(--g500)' }}>
              hedjav@gmail.com
            </a>{' '}
            avec votre référence de paiement pour obtenir le fichier immédiatement.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orphanItems.map((p) => (
              <div
                key={p.purchaseId}
                style={{
                  padding: 'var(--s3) var(--s4)',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <strong>Ebook #{p.ebookId.slice(0, 8)}</strong>
                <span style={{ marginLeft: 10, color: 'var(--muted)' }}>
                  {formatAmount(p.amount)} FCFA — acheté le{' '}
                  {new Date(p.purchaseCreatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableItems.length === 0 && orphanItems.length === 0 ? (
        <div className="hedjav-empty-state">
          <p style={{ color: 'var(--muted)' }}>Vous n&apos;avez pas encore acheté d&apos;ebook.</p>
          <a href="/ebooks" className="btn btn-gold" style={{ marginTop: 'var(--s5)' }}>
            Voir le catalogue
          </a>
        </div>
      ) : (
        <div className="hedjav-grid-3">
          {availableItems.map(({ ebook, invoiceUrl, purchaseId }) => (
            <PurchasedEbookCard
              key={purchaseId}
              ebook={ebook!}
              invoiceUrl={invoiceUrl}
            />
          ))}
        </div>
      )}
    </>
  )
}
