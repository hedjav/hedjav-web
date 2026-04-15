'use client'

import Link from 'next/link'

type Props = {
  /** IDs documents actuellement affichés (résultat des filtres de la page). */
  visibleIds: string[]
  /** Libellé du contexte courant : ex. "rapports Sonatel", "BOC 7j". */
  contextLabel?: string
}

/**
 * Bouton « Générer un article depuis le lot affiché » pour les pages de
 * liste BRVM. Prend un article max, capé à 10 docs (au-delà le prompt
 * devient trop dense et la génération part en vrille).
 *
 * L'admin arrive donc au wizard avec un prompt pré-rempli :
 *   - source_type sera `ai_brvm_batch`
 *   - source_documents contiendra les IDs (cap 10)
 */
export function BatchGenerateBar({ visibleIds, contextLabel }: Props) {
  const count = visibleIds.length
  const capped = visibleIds.slice(0, 10)
  if (count === 0) return null

  const href = `/admin/ia/articles?document_ids=${encodeURIComponent(capped.join(','))}`
  const overflow = count > capped.length

  return (
    <Link
      href={href}
      style={{
        fontSize: 12,
        color: 'var(--admin-accent, #C5A028)',
        textDecoration: 'none',
        padding: '6px 14px',
        border: '1px solid color-mix(in srgb, var(--admin-accent, #C5A028) 50%, transparent)',
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      title={
        contextLabel
          ? `Générer un article depuis ${contextLabel} (${capped.length} doc${capped.length > 1 ? 's' : ''}${overflow ? `, sur ${count} affichés` : ''})`
          : undefined
      }
    >
      Générer un article (
      {overflow ? `10 sur ${count}` : capped.length}
      )
    </Link>
  )
}
