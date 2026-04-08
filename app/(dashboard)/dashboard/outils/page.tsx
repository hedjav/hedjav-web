import type { Metadata } from 'next'
import { EpargneSimulator } from '@/components/features/EpargneSimulator'
import { LocatifSimulator } from '@/components/features/LocatifSimulator'

export const metadata: Metadata = { title: 'Outils patrimoniaux' }

export default function OutilsPage() {
  return (
    <>
      <div style={{ marginBottom: 'var(--s10)' }}>
        <span className="eyebrow">Outils</span>
        <h1 className="h2" style={{ marginTop: 'var(--s3)' }}>
          Simulateurs patrimoniaux
        </h1>
        <p style={{ marginTop: 'var(--s4)', color: 'var(--muted)', maxWidth: 720 }}>
          Deux outils calibrés pour la zone UEMOA — pour visualiser concrètement
          l&apos;impact d&apos;une stratégie d&apos;épargne et la rentabilité d&apos;un investissement
          immobilier locatif.
        </p>
      </div>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r16)',
          padding: 'var(--s8)',
          marginBottom: 'var(--s8)',
        }}
      >
        <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>
          📈 Simulateur d&apos;épargne long terme
        </h2>
        <EpargneSimulator />
      </section>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r16)',
          padding: 'var(--s8)',
        }}
      >
        <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>
          🏠 Simulateur de rendement locatif UEMOA
        </h2>
        <LocatifSimulator />
      </section>
    </>
  )
}
