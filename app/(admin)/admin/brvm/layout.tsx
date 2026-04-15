import type { ReactNode } from 'react'
import { BrvmNav } from './_components/BrvmNav'

/**
 * Layout du Centre de Veille BRVM.
 *
 * Structure : sidebar sticky à gauche (260px) + contenu fluide à droite.
 * La sidebar applique la logique 4 univers (Marché, Rapports, Annonces, Publications).
 */
export default function BrvmLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr)',
        gap: 'var(--s5)',
        alignItems: 'start',
      }}
    >
      <BrvmNav />
      <main style={{ minWidth: 0 }}>{children}</main>
    </div>
  )
}
