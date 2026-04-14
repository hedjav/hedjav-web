import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUserPurchases } from '@/lib/purchases/queries'

export const metadata: Metadata = { title: 'Mes commandes' }

function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'paid':
      return { label: 'Payé', className: 'badge badge-success' }
    case 'pending':
      return { label: 'En attente', className: 'badge badge-warning' }
    case 'failed':
      return { label: 'Échoué', className: 'badge badge-danger' }
    case 'refunded':
      return { label: 'Remboursé', className: 'badge badge-navy' }
    default:
      return { label: status, className: 'badge badge-navy' }
  }
}

export default async function MesCommandesPage() {
  const purchases = await getCurrentUserPurchases()

  return (
    <>
      <span className="eyebrow">Historique</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        Mes commandes
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 'var(--s8)', maxWidth: 640 }}>
        Retrouvez toutes vos transactions Hedjav : ebooks achetés, tentatives en cours et commandes passées.
        Besoin d&apos;une facture ou d&apos;aide sur une commande ?{' '}
        <a href="mailto:hedjav@gmail.com" style={{ color: 'var(--g500)' }}>
          hedjav@gmail.com
        </a>
        .
      </p>

      {purchases.length === 0 ? (
        <div className="hedjav-empty-state">
          <p style={{ color: 'var(--muted)' }}>
            Aucune commande pour l&apos;instant. Quand vous achèterez un ebook ou une formation, elle apparaîtra ici
            avec sa facture PDF.
          </p>
          <Link href="/ebooks" className="btn btn-gold" style={{ marginTop: 'var(--s5)' }}>
            Voir le catalogue
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r12)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)', textAlign: 'left' }}>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600 }}>Ebook</th>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600, textAlign: 'right' }}>Montant</th>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600 }}>Paiement</th>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600 }}>Statut</th>
                  <th style={{ padding: 'var(--s4)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const badge = statusBadge(p.status)
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 'var(--s4)', color: 'var(--muted)' }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ padding: 'var(--s4)' }}>
                        {p.ebook?.title ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Ebook retiré du catalogue</span>}
                      </td>
                      <td style={{ padding: 'var(--s4)', textAlign: 'right', fontFamily: 'var(--fm)' }}>
                        {formatAmount(p.amount)} FCFA
                      </td>
                      <td style={{ padding: 'var(--s4)', fontSize: 12, color: 'var(--muted)' }}>
                        {p.payment_method || '—'}
                      </td>
                      <td style={{ padding: 'var(--s4)' }}>
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                      <td style={{ padding: 'var(--s4)', textAlign: 'right' }}>
                        {p.status === 'paid' && p.ebook ? (
                          <Link
                            href="/dashboard/mes-ebooks"
                            className="btn btn-outline btn-sm"
                          >
                            Accéder
                          </Link>
                        ) : p.status === 'pending' ? (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            En vérification
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
