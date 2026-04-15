/**
 * Extensions de la catégorie "Rapports sociétés cotées" au-delà des 3 types
 * déjà scrapés dans brvm-org.ts (rapport_annuel, rapport_semestriel, rapport_trimestriel).
 *
 * Ajoute :
 *   - États financiers (distincts du rapport annuel complet)
 *   - Commentaires d'activité (CA trimestriel, rapports d'activité)
 *
 * Note : les 3 types classiques restent scrapés par scrapeRapportsIndex et les
 * sous-pages société dans brvm-org.ts. On ajoute ici les 2 sous-types manquants.
 */

import type { CategoryConfig } from './_category'
import { scrapeCategories, scrapeCategory } from './_category'

const BASE = 'https://www.brvm.org'

const CATEGORIES: CategoryConfig[] = [
  {
    label: 'États financiers',
    doc_family: 'report',
    doc_subtype: 'etats_financiers',
    doc_type_legacy: 'rapport_annuel',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/etats-financiers`,
      `${BASE}/fr/emetteurs/type-annonces/etats-financiers-audites`,
      `${BASE}/fr/rapports-societes-cotees`,
    ],
    paginate: true,
    max_pages: 10,
    filename_filter: /(_fs_|etats_financiers|comptes_annuels|bilan_)/i,
  },
  {
    label: "Commentaires d'activité",
    doc_family: 'report',
    doc_subtype: 'commentaire_activite',
    doc_type_legacy: 'rapport_trimestriel',
    listing_urls: [
      `${BASE}/fr/emetteurs/type-annonces/commentaires-activite`,
      `${BASE}/fr/emetteurs/type-annonces/commentaire-activite`,
      `${BASE}/fr/emetteurs/type-annonces/rapports-activite`,
    ],
    paginate: true,
    max_pages: 10,
  },
]

export const RAPPORTS_EXTENSIONS = CATEGORIES

export async function scrapeRapportsExtensions() {
  return scrapeCategories(CATEGORIES)
}

export async function scrapeRapportSubtype(subtype: string) {
  const cfg = CATEGORIES.find((c) => c.doc_subtype === subtype)
  if (!cfg) throw new Error(`Sous-type de rapport inconnu: ${subtype}`)
  return scrapeCategory(cfg)
}
