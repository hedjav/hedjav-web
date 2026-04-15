/**
 * Types partagés veille documentaire BRVM.
 *
 * Refonte 2026-04-15 — 4 univers :
 *   - market        : données de marché (résumé, cours, indices)
 *   - report        : rapports sociétés cotées
 *   - announcement  : annonces émetteurs (AG, résolutions, notations, ESV, etc.)
 *   - publication   : publications BRVM (BOC, bulletins, stats, etc.)
 *
 * `DocType` (legacy, migration 020/023) reste en place pour compatibilité. La
 * nouvelle logique utilise `DocFamily` + `DocSubtype` (migration 028).
 */

/* ─── Legacy (conservé, migration 020/023) ─────────────────────────────── */

export const DOC_TYPES = [
  'boc',
  'rapport_annuel',
  'rapport_trimestriel',
  'rapport_semestriel',
  'communique',
  'annonce',
  'note_information',
  'avis',
  'autre',
] as const

export type DocType = (typeof DOC_TYPES)[number]

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  boc: 'BOC',
  rapport_annuel: 'Rapport annuel',
  rapport_trimestriel: 'Rapport trimestriel',
  rapport_semestriel: 'Rapport semestriel',
  communique: 'Communiqué',
  annonce: 'Annonce',
  note_information: "Note d'information",
  avis: 'Avis',
  autre: 'Autre',
}

/* ─── Refonte 4 univers (migration 028) ────────────────────────────────── */

export const DOC_FAMILIES = ['market', 'report', 'announcement', 'publication'] as const
export type DocFamily = (typeof DOC_FAMILIES)[number]

export const DOC_FAMILY_LABELS: Record<DocFamily, string> = {
  market: 'Données de marché',
  report: 'Rapports cotées',
  announcement: 'Annonces émetteurs',
  publication: 'Publications',
}

/** Sous-types par famille. Liste fermée mais évolutive (text libre en DB). */
export const DOC_SUBTYPES = {
  report: [
    'rapport_annuel',
    'rapport_semestriel',
    'rapport_trimestriel',
    'etats_financiers',
    'commentaire_activite',
  ],
  announcement: [
    'convocation_ag',
    'projet_resolution',
    'notation_financiere',
    'esv',
    'communique',
    'changement_dirigeant',
    'franchissement_seuil',
    'information_permanente',
  ],
  publication: [
    'boc',
    'bulletin_mensuel',
    'statistique_trimestrielle',
    'annee_boursiere',
    'avis',
    'donnee_economique',
    'valeur_liquidative',
  ],
  market: [] as string[],
} as const satisfies Record<DocFamily, readonly string[]>

export type DocSubtype =
  | (typeof DOC_SUBTYPES.report)[number]
  | (typeof DOC_SUBTYPES.announcement)[number]
  | (typeof DOC_SUBTYPES.publication)[number]

export const DOC_SUBTYPE_LABELS: Record<DocSubtype, string> = {
  // report
  rapport_annuel: 'Rapport annuel',
  rapport_semestriel: 'Rapport semestriel',
  rapport_trimestriel: 'Rapport trimestriel',
  etats_financiers: 'États financiers',
  commentaire_activite: "Commentaire d'activité",
  // announcement
  convocation_ag: 'Convocation AG',
  projet_resolution: 'Projet de résolution',
  notation_financiere: 'Notation financière',
  esv: 'ESV',
  communique: 'Communiqué',
  changement_dirigeant: 'Changement de dirigeant',
  franchissement_seuil: 'Franchissement de seuil',
  information_permanente: 'Information permanente',
  // publication
  boc: 'BOC',
  bulletin_mensuel: 'Bulletin mensuel',
  statistique_trimestrielle: 'Statistique trimestrielle',
  annee_boursiere: 'Année boursière',
  avis: 'Avis',
  donnee_economique: 'Donnée économique',
  valeur_liquidative: 'Valeur liquidative',
}

/** Retourne la famille d'un subtype (utile pour routage UI). */
export function familyOfSubtype(subtype: string): DocFamily | null {
  for (const f of DOC_FAMILIES) {
    if ((DOC_SUBTYPES[f] as readonly string[]).includes(subtype)) return f
  }
  return null
}

/* ─── Sources & documents ──────────────────────────────────────────────── */

export type SourceSlug = 'brvm-org' | 'bfin' | 'sikafinance'

export type BrvmSource = {
  id: string
  slug: SourceSlug | string
  name: string
  base_url: string
  priority: number
  is_active: boolean
  last_scraped_at: string | null
  last_success_at: string | null
  last_error: string | null
  metadata: Record<string, unknown>
}

export type DocumentInput = {
  source_slug: SourceSlug | string
  /** Legacy — conserver pour compat. Utiliser doc_subtype côté logique métier. */
  doc_type: DocType
  /** Famille 4 univers (migration 028). Si absente, inférée depuis doc_type. */
  doc_family?: DocFamily
  /** Sous-type fin (migration 028). Si absent, = doc_type. */
  doc_subtype?: string
  title: string
  description?: string | null
  doc_date?: string | null
  source_url: string
  pdf_url?: string | null
  issuer_slug?: string | null
  issuer_name?: string | null
  emetteur_id?: string | null
  sector?: string | null
  market_index?: string | null
  published_at?: string | null
  metadata?: Record<string, unknown>
}

export type BrvmDocument = {
  id: string
  source_id: string
  doc_type: DocType
  doc_family: DocFamily | null
  doc_subtype: string | null
  emetteur_id: string | null
  doc_date: string | null
  title: string
  description: string | null
  source_url: string
  pdf_url: string | null
  issuer_slug: string | null
  issuer_name: string | null
  sector: string | null
  market_index: string | null
  checksum: string
  is_new: boolean
  is_processed: boolean
  processed_at: string | null
  processed_by: string | null
  discovered_at: string
  published_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ScrapeResult = {
  source_slug: SourceSlug | string
  doc_type: DocType | DocFamily | 'mixed'
  discovered: number
  skipped: number
  errors: number
  duration_ms: number
  details?: Array<{ title: string; status: 'new' | 'skipped' | 'error'; error?: string }>
}

/* ─── Émetteurs (migration 027) ────────────────────────────────────────── */

export type BrvmEmetteur = {
  id: string
  slug: string
  ticker: string | null
  name: string
  full_name: string | null
  isin: string | null
  country: string | null
  sector: string | null
  market: 'actions' | 'obligations' | null
  indices: string[]
  aliases: string[]
  is_active: boolean
  logo_url: string | null
  source_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type EmetteurInput = {
  slug: string
  ticker?: string | null
  name: string
  full_name?: string | null
  isin?: string | null
  country?: string | null
  sector?: string | null
  market?: 'actions' | 'obligations' | null
  indices?: string[]
  aliases?: string[]
  is_active?: boolean
  logo_url?: string | null
  source_url?: string | null
  metadata?: Record<string, unknown>
}

/* ─── Séries temporelles marché (migration 029) ────────────────────────── */

export type MarketSnapshot = {
  id: string
  snapshot_date: string
  source_id: string | null
  valeur_transactions_fcfa: number | null
  capi_actions_fcfa: number | null
  capi_obligations_fcfa: number | null
  nb_titres_echanges: number | null
  nb_transactions: number | null
  raw: Record<string, unknown>
  created_at: string
}

export type MarketTick = {
  id: string
  emetteur_id: string | null
  tick_date: string
  market: 'actions' | 'obligations'
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  previous_close: number | null
  variation_pct: number | null
  volume: number | null
  value_fcfa: number | null
  raw: Record<string, unknown>
  created_at: string
}

export type IndexTick = {
  id: string
  index_code: string
  tick_date: string
  value: number
  variation_pct: number | null
  ytd_pct: number | null
  raw: Record<string, unknown>
  created_at: string
}
