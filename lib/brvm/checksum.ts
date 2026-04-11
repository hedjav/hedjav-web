import { createHash } from 'node:crypto'
import type { DocumentInput } from './types'

/**
 * Calcule un checksum SHA256 composite pour un document BRVM.
 *
 * Stratégie : on hash un canonical string composé de :
 *   source_slug | pdf_url (si dispo) OU source_url | title normalisé
 *
 * Propriétés :
 * - Idempotent : re-scraper le même document = même hash
 * - Détecte les republications (si l'URL change, nouveau hash)
 * - Indépendant du contenu du PDF (on ne télécharge pas pour hasher)
 * - Les titres sont normalisés (lowercase, espaces collapsés) pour tolérer
 *   les variations mineures de mise en forme entre scraping runs.
 */
export function computeChecksum(doc: Pick<DocumentInput, 'source_slug' | 'pdf_url' | 'source_url' | 'title'>): string {
  const canonical = [
    doc.source_slug.toLowerCase().trim(),
    (doc.pdf_url || doc.source_url).toLowerCase().trim(),
    normalizeTitle(doc.title),
  ].join('|')

  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

/** Normalise un titre : lowercase + collapse whitespace + trim. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // retire accents
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calcule un checksum SHA256 à partir d'un buffer (utilisé optionnellement
 * par le script d'import historique pour hasher le contenu réel des PDFs).
 */
export function computeFileChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
