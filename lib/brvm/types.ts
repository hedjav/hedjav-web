/**
 * Types partagés veille documentaire BRVM.
 * Voir migration 020_brvm_refactor.sql pour le schéma DB correspondant.
 */

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

/**
 * Shape "entrée" d'un document scrapé, avant insert en base.
 * Le checksum est calculé par `computeChecksum()` dans checksum.ts.
 */
export type DocumentInput = {
  source_slug: SourceSlug | string
  doc_type: DocType
  title: string
  description?: string | null
  doc_date?: string | null // ISO 'YYYY-MM-DD'
  source_url: string
  pdf_url?: string | null
  issuer_slug?: string | null
  issuer_name?: string | null
  published_at?: string | null
  metadata?: Record<string, unknown>
}

export type BrvmDocument = {
  id: string
  source_id: string
  doc_type: DocType
  doc_date: string | null
  title: string
  description: string | null
  source_url: string
  pdf_url: string | null
  issuer_slug: string | null
  issuer_name: string | null
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
  doc_type: DocType | 'mixed'
  discovered: number // nouveaux documents insérés
  skipped: number // déjà présents (checksum match)
  errors: number
  duration_ms: number
  details?: Array<{ title: string; status: 'new' | 'skipped' | 'error'; error?: string }>
}
