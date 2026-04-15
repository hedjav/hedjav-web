/**
 * 7 sous-catégories de Publications BRVM.
 * BOC n'est qu'une sous-catégorie parmi les autres — pas dominante.
 */

import type { CategoryConfig } from '../_category'
import { scrapeCategories, scrapeCategory } from '../_category'

const BASE = 'https://www.brvm.org'

const CATEGORIES: CategoryConfig[] = [
  {
    label: 'BOC — Bulletins Officiels de la Cote',
    doc_family: 'publication',
    doc_subtype: 'boc',
    doc_type_legacy: 'boc',
    listing_urls: [
      `${BASE}/fr/bulletins-officiels-de-la-cote`,
      `${BASE}/fr/bulletins-officiels-de-la-cote.html`,
      `${BASE}/fr/marche/bulletin-officiel-de-la-cote`,
    ],
    paginate: true,
    max_pages: 15,
    filename_filter: /boc_\d{8}/i,
  },
  {
    label: 'Bulletins mensuels',
    doc_family: 'publication',
    doc_subtype: 'bulletin_mensuel',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/bulletins-mensuels`,
      `${BASE}/fr/bulletins-mensuels.html`,
      `${BASE}/fr/marche/bulletin-mensuel`,
    ],
    paginate: true,
    max_pages: 10,
  },
  {
    label: 'Statistiques trimestrielles',
    doc_family: 'publication',
    doc_subtype: 'statistique_trimestrielle',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/statistiques-trimestrielles`,
      `${BASE}/fr/statistiques-trimestrielles.html`,
      `${BASE}/fr/marche/statistiques-trimestrielles`,
    ],
    paginate: true,
    max_pages: 5,
  },
  {
    label: 'Années boursières',
    doc_family: 'publication',
    doc_subtype: 'annee_boursiere',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/annees-boursieres`,
      `${BASE}/fr/annee-boursiere`,
      `${BASE}/fr/marche/annees-boursieres`,
    ],
    paginate: true,
    max_pages: 3,
  },
  {
    label: 'Avis & Publications',
    doc_family: 'publication',
    doc_subtype: 'avis',
    doc_type_legacy: 'avis',
    listing_urls: [
      `${BASE}/fr/marche/avis-et-publications/publications`,
      `${BASE}/fr/marche/avis-et-publications`,
      `${BASE}/fr/avis-et-publications`,
    ],
    paginate: true,
    max_pages: 10,
  },
  {
    label: 'Données économiques',
    doc_family: 'publication',
    doc_subtype: 'donnee_economique',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/donnees-economiques`,
      `${BASE}/fr/marche/donnees-economiques`,
      `${BASE}/fr/donnee-economique`,
    ],
    paginate: true,
    max_pages: 5,
  },
  {
    label: 'Valeurs liquidatives',
    doc_family: 'publication',
    doc_subtype: 'valeur_liquidative',
    doc_type_legacy: 'autre',
    listing_urls: [
      `${BASE}/fr/valeurs-liquidatives`,
      `${BASE}/fr/valeur-liquidative`,
      `${BASE}/fr/marche/valeurs-liquidatives`,
    ],
    paginate: true,
    max_pages: 5,
  },
]

export const PUBLICATIONS_CATEGORIES = CATEGORIES

export async function scrapeAllPublications() {
  return scrapeCategories(CATEGORIES)
}

export async function scrapePublicationSubtype(subtype: string) {
  const cfg = CATEGORIES.find((c) => c.doc_subtype === subtype)
  if (!cfg) throw new Error(`Sous-type de publication inconnu: ${subtype}`)
  return scrapeCategory(cfg)
}
