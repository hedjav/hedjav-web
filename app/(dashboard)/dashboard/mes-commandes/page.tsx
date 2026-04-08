import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mes commandes' }

export default function MesCommandesPage() {
  return (
    <>
      <span className="eyebrow">Historique</span>
      <h1 className="h2" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
        Mes commandes
      </h1>
      <div className="hedjav-empty-state">
        <p style={{ color: 'var(--muted)' }}>Aucune commande pour le moment.</p>
      </div>
    </>
  )
}
