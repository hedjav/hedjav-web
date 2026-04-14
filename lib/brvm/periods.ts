/**
 * Helper de périodes pour les filtres BRVM (hub admin + alertes email).
 *
 * Règle produit : le tri est TOUJOURS décroissant sur la date effective.
 * La date effective d'un document est :
 *   - doc_date si renseignée
 *   - sinon discovered_at (filet de sécurité pour docs sans date)
 *
 * Presets exposés : today | 7d | 30d | this_month | custom | all
 */

export type PeriodPreset = 'today' | '7d' | '30d' | 'this_month' | 'custom' | 'all'

export type PeriodRange = {
  /** Préréglage demandé, pour affichage UI. */
  preset: PeriodPreset
  /** Borne basse ISO (yyyy-mm-dd). null = pas de borne basse. */
  from: string | null
  /** Borne haute ISO (yyyy-mm-dd). null = jusqu'à aujourd'hui. */
  to: string | null
  /** Libellé humain pour l'UI et les emails. */
  label: string
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  this_month: 'Ce mois-ci',
  custom: 'Période personnalisée',
  all: 'Tout',
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Résout un preset en dates ISO bornées.
 * Pour 'custom', fournir `customFrom` et/ou `customTo` (yyyy-mm-dd).
 * Les bornes sont toutes inclusives (side .gte / .lte côté SQL).
 */
export function resolvePeriod(
  preset: PeriodPreset,
  customFrom?: string | null,
  customTo?: string | null,
): PeriodRange {
  const now = new Date()
  const today = isoDay(now)

  switch (preset) {
    case 'today':
      return { preset, from: today, to: today, label: PRESET_LABELS.today }

    case '7d': {
      const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
      return { preset, from: isoDay(d), to: today, label: PRESET_LABELS['7d'] }
    }

    case '30d': {
      const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
      return { preset, from: isoDay(d), to: today, label: PRESET_LABELS['30d'] }
    }

    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { preset, from: isoDay(first), to: today, label: PRESET_LABELS.this_month }
    }

    case 'custom': {
      const from = customFrom && /^\d{4}-\d{2}-\d{2}$/.test(customFrom) ? customFrom : null
      const to = customTo && /^\d{4}-\d{2}-\d{2}$/.test(customTo) ? customTo : null
      const label = from && to ? `du ${from} au ${to}` : from ? `depuis ${from}` : to ? `jusqu'au ${to}` : PRESET_LABELS.custom
      return { preset, from, to, label }
    }

    case 'all':
    default:
      return { preset: 'all', from: null, to: null, label: PRESET_LABELS.all }
  }
}

/**
 * Parse une valeur brute issue de query string / form en PeriodPreset sûr.
 */
export function parsePeriodPreset(raw: string | null | undefined): PeriodPreset {
  const val = (raw ?? '').toLowerCase()
  if (val === 'today' || val === '7d' || val === '30d' || val === 'this_month' || val === 'custom' || val === 'all') {
    return val
  }
  return '7d' // défaut produit : les 7 derniers jours couvrent la fenêtre BOC + rapports récents
}

export const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = (
  ['today', '7d', '30d', 'this_month', 'custom', 'all'] as PeriodPreset[]
).map((id) => ({ id, label: PRESET_LABELS[id] }))
