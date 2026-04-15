/**
 * 8 sous-catégories d'annonces émetteurs BRVM.
 * Chaque entrée = une catégorie fidèle à la nomenclature brvm.org /
 * richbourse. Les scrapers utilisent `scrapeCategory` générique.
 */

import type { CategoryConfig } from '../_category'
import { scrapeCategories, scrapeCategory } from '../_category'

const BASE = 'https://www.brvm.org'

const CATEGORIES: CategoryConfig[] = [
  {
    label: 'Convocations AG',
    doc_family: 'announcement',
    doc_subtype: 'convocation_ag',
    doc_type_legacy: 'annonce',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/assemblees-generales`,
      `${BASE}/fr/emetteurs/type-annonces/assemblees-generales.html`,
      `${BASE}/fr/emetteurs/type-annonces/convocations-assemblees-generales`,
    ],
    paginate: true,
    max_pages: 10,
  },
  {
    label: 'Projets de résolution',
    doc_family: 'announcement',
    doc_subtype: 'projet_resolution',
    doc_type_legacy: 'annonce',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/projets-de-resolution`,
      `${BASE}/fr/emetteurs/type-annonces/projets-de-resolutions`,
      `${BASE}/fr/emetteurs/type-annonces/projet-de-resolution`,
    ],
    paginate: true,
    max_pages: 10,
  },
  {
    label: 'Notations financières',
    doc_family: 'announcement',
    doc_subtype: 'notation_financiere',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/notations-financieres`,
      `${BASE}/fr/emetteurs/type-annonces/notation-financiere`,
      `${BASE}/fr/emetteurs/type-annonces/notations`,
    ],
    paginate: true,
    max_pages: 5,
  },
  {
    label: 'ESV — Événements sur valeurs',
    doc_family: 'announcement',
    doc_subtype: 'esv',
    doc_type_legacy: 'annonce',
    // Sur brvm.org, les « Événements sur valeurs » correspondent aux bilans
    // des contrats de liquidité (dividende, split, pacte, etc.). Fallback sur
    // les autres slugs historiques pour robustesse future.
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/bilan-des-contrats-de-liquidite`,
      `${BASE}/fr/emetteurs/type-annonces/evenements-sur-valeurs`,
      `${BASE}/fr/emetteurs/type-annonces/esv`,
    ],
    paginate: true,
    max_pages: 10,
  },
  {
    label: 'Communiqués',
    doc_family: 'announcement',
    doc_subtype: 'communique',
    doc_type_legacy: 'communique',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/communiques`,
      `${BASE}/fr/emetteurs/type-annonces/communique`,
      `${BASE}/fr/emetteurs/type-annonces/communiques.html`,
    ],
    paginate: true,
    max_pages: 15,
  },
  {
    label: 'Changements de dirigeants',
    doc_family: 'announcement',
    doc_subtype: 'changement_dirigeant',
    doc_type_legacy: 'annonce',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/changements-de-dirigeants`,
      `${BASE}/fr/emetteurs/type-annonces/changement-de-dirigeant`,
      `${BASE}/fr/emetteurs/type-annonces/changements-dirigeants`,
    ],
    paginate: true,
    max_pages: 5,
  },
  {
    label: 'Franchissements de seuil',
    doc_family: 'announcement',
    doc_subtype: 'franchissement_seuil',
    doc_type_legacy: 'annonce',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/franchissements-de-seuil`,
      `${BASE}/fr/emetteurs/type-annonces/franchissement-de-seuil`,
      `${BASE}/fr/emetteurs/type-annonces/franchissements-seuil`,
    ],
    paginate: true,
    max_pages: 5,
  },
  {
    label: 'Informations permanentes',
    doc_family: 'announcement',
    doc_subtype: 'information_permanente',
    doc_type_legacy: 'note_information',
    // Sur brvm.org, les « informations permanentes » ne sont pas une page
    // dédiée — elles vivent dans la section avis & publications ainsi qu'en
    // notes d'information réglementaires. On fallback proprement.
    listing_urls: [
      `${BASE}/fr/marche/avis-et-publications/publications`,
      `${BASE}/fr/emetteurs/type-annonces/informations-permanentes`,
      `${BASE}/fr/emetteurs/type-annonces/notes-information`,
    ],
    paginate: true,
    max_pages: 5,
    filename_filter: /(information|permanente|note_information|note_dinformation|amf_|obligations_permanentes)/i,
  },
]

export const ANNONCES_CATEGORIES = CATEGORIES

export async function scrapeAllAnnonces() {
  return scrapeCategories(CATEGORIES)
}

export async function scrapeAnnonceSubtype(subtype: string) {
  const cfg = CATEGORIES.find((c) => c.doc_subtype === subtype)
  if (!cfg) throw new Error(`Sous-type d'annonce inconnu: ${subtype}`)
  return scrapeCategory(cfg)
}
