/**
 * Seed de référence des sociétés cotées BRVM.
 *
 * Cette liste sert de fallback fiable quand brvm.org est down ou lent, et
 * garantit que la table `brvm_emetteurs` contient au moins les principales
 * valeurs UEMOA dès l'application des migrations.
 *
 * Le scraper `lib/brvm/scrapers/emetteurs.ts` enrichit ensuite cette base
 * (ajoute les nouvelles sociétés, complète logos, ISIN, indices).
 *
 * Conventions :
 *   - slug : identique au pattern URL brvm.org (`-` séparateur)
 *   - market : toujours 'actions' pour cette liste (les obligations sont seedées à part)
 *   - aliases : variantes observées sur brvm.org / sikafinance / documents
 */

import type { EmetteurInput } from './types'

export const EMETTEURS_SEED: EmetteurInput[] = [
  // Télécoms
  { slug: 'sonatel-sn', ticker: 'SNTS', name: 'Sonatel', full_name: 'Société Nationale des Télécommunications du Sénégal', country: 'SN', sector: 'Télécommunications', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['Sonatel SN', 'SNTS', 'sonatel'] },
  { slug: 'orange-ci', ticker: 'ORAC', name: 'Orange Côte d\'Ivoire', full_name: 'Orange Côte d\'Ivoire SA', country: 'CI', sector: 'Télécommunications', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['Orange CI', 'ORAC', 'orange cote divoire'] },
  { slug: 'onatel-bf', ticker: 'ONTBF', name: 'ONATEL', full_name: 'Office National des Télécommunications Burkina Faso', country: 'BF', sector: 'Télécommunications', market: 'actions', indices: ['BRVM-C'], aliases: ['ONATEL BF', 'ONTBF'] },

  // Finance — Banques UEMOA
  { slug: 'boa-benin', ticker: 'BOAB', name: 'BOA Bénin', full_name: 'Bank Of Africa Bénin', country: 'BJ', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['BOA Benin', 'BOAB'] },
  { slug: 'boa-burkina-faso', ticker: 'BOABF', name: 'BOA Burkina Faso', full_name: 'Bank Of Africa Burkina Faso', country: 'BF', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['BOA BF', 'BOABF'] },
  { slug: 'boa-ci', ticker: 'BOAC', name: 'BOA Côte d\'Ivoire', full_name: 'Bank Of Africa Côte d\'Ivoire', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['BOA CI', 'BOAC'] },
  { slug: 'boa-mali', ticker: 'BOAM', name: 'BOA Mali', full_name: 'Bank Of Africa Mali', country: 'ML', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['BOA ML', 'BOAM'] },
  { slug: 'boa-niger', ticker: 'BOAN', name: 'BOA Niger', full_name: 'Bank Of Africa Niger', country: 'NE', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['BOA NE', 'BOAN'] },
  { slug: 'boa-senegal', ticker: 'BOAS', name: 'BOA Sénégal', full_name: 'Bank Of Africa Sénégal', country: 'SN', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['BOA SN', 'BOAS'] },
  { slug: 'ecobank-ci', ticker: 'ETIT', name: 'Ecobank CI', full_name: 'Ecobank Côte d\'Ivoire', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['Ecobank Transnational'] },
  { slug: 'sgb-ci', ticker: 'SGBC', name: 'Société Générale CI', full_name: 'Société Générale Côte d\'Ivoire', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['SGB CI', 'SGBC'] },
  { slug: 'sib-ci', ticker: 'SIBC', name: 'SIB', full_name: 'Société Ivoirienne de Banque', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['SIBC'] },
  { slug: 'coris-bank-international-bf', ticker: 'CBIBF', name: 'Coris Bank International', full_name: 'Coris Bank International BF', country: 'BF', sector: 'Finance', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['Coris BF', 'CBIBF'] },
  { slug: 'nsia-banque-ci', ticker: 'NSBC', name: 'NSIA Banque CI', full_name: 'NSIA Banque Côte d\'Ivoire', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['NSIA Banque', 'NSBC'] },
  { slug: 'bicici', ticker: 'BICC', name: 'BICICI', full_name: 'Banque Internationale pour le Commerce et l\'Industrie de la Côte d\'Ivoire', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['BICICI', 'BICC'] },
  { slug: 'safca-ci', ticker: 'SAFC', name: 'SAFCA', full_name: 'Société Africaine de Crédit Automobile', country: 'CI', sector: 'Finance', market: 'actions', indices: ['BRVM-C'], aliases: ['SAFCA', 'SAFC'] },

  // Agro-alimentaire
  { slug: 'palmci', ticker: 'PALC', name: 'Palmci', full_name: 'Palmci SA', country: 'CI', sector: 'Agro-alimentaire', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['PALMCI', 'PALC'] },
  { slug: 'saph-ci', ticker: 'SPHC', name: 'SAPH', full_name: 'Société Africaine de Plantations d\'Hévéas', country: 'CI', sector: 'Agro-alimentaire', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['SAPH', 'SPHC'] },
  { slug: 'sitab-ci', ticker: 'STBC', name: 'SITAB', full_name: 'Société Ivoirienne des Tabacs', country: 'CI', sector: 'Agro-alimentaire', market: 'actions', indices: ['BRVM-C'], aliases: ['SITAB', 'STBC'] },
  { slug: 'sucrivoire-ci', ticker: 'SCRC', name: 'Sucrivoire', full_name: 'Société Sucrière de Côte d\'Ivoire', country: 'CI', sector: 'Agro-alimentaire', market: 'actions', indices: ['BRVM-C'], aliases: ['Sucrivoire', 'SCRC'] },
  { slug: 'solibra-ci', ticker: 'SLBC', name: 'Solibra', full_name: 'Société Ivoirienne de Brasseries', country: 'CI', sector: 'Agro-alimentaire', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['Solibra', 'SLBC'] },

  // Industrie
  { slug: 'sicable-ci', ticker: 'SICC', name: 'Sicable', full_name: 'Société Ivoirienne de Câbles', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['SICABLE', 'SICC'] },
  { slug: 'filtisac-ci', ticker: 'FTSC', name: 'Filtisac', full_name: 'Filtisac', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['FILTISAC', 'FTSC'] },
  { slug: 'smb-ci', ticker: 'SMBC', name: 'SMB', full_name: 'Société Multinationale de Bitumes', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['SMB', 'SMBC'] },
  { slug: 'uniwax-ci', ticker: 'UNXC', name: 'Uniwax', full_name: 'Uniwax', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['UNIWAX', 'UNXC'] },
  { slug: 'nei-ceda-ci', ticker: 'NEIC', name: 'NEI-CEDA', full_name: 'NEI-CEDA', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['NEI CEDA', 'NEIC'] },
  { slug: 'air-liquide-ci', ticker: 'SIVC', name: 'Air Liquide CI', full_name: 'Air Liquide Côte d\'Ivoire', country: 'CI', sector: 'Industrie', market: 'actions', indices: ['BRVM-C'], aliases: ['Air Liquide', 'SIVC'] },

  // Énergie & utilities
  { slug: 'cie-ci', ticker: 'CIEC', name: 'CIE', full_name: 'Compagnie Ivoirienne d\'Électricité', country: 'CI', sector: 'Énergie', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['CIE', 'CIEC'] },
  { slug: 'sodeci', ticker: 'SDCC', name: 'SODECI', full_name: 'Société de Distribution d\'Eau de Côte d\'Ivoire', country: 'CI', sector: 'Utilities', market: 'actions', indices: ['BRVM-C'], aliases: ['SODECI', 'SDCC', 'SODE-CI'] },
  { slug: 'total-ci', ticker: 'TTLC', name: 'Total CI', full_name: 'Total Côte d\'Ivoire', country: 'CI', sector: 'Pétrole', market: 'actions', indices: ['BRVM-C', 'BRVM-30', 'BRVM-PRES'], aliases: ['Total CI', 'TTLC'] },
  { slug: 'total-senegal', ticker: 'TTLS', name: 'Total Sénégal', full_name: 'Total Sénégal', country: 'SN', sector: 'Pétrole', market: 'actions', indices: ['BRVM-C'], aliases: ['Total SN', 'TTLS'] },
  { slug: 'vivo-energy-ci', ticker: 'SHEC', name: 'Vivo Energy CI', full_name: 'Vivo Energy Côte d\'Ivoire', country: 'CI', sector: 'Pétrole', market: 'actions', indices: ['BRVM-C', 'BRVM-30'], aliases: ['Vivo Energy', 'SHEC', 'Shell CI'] },

  // Distribution, services, BTP
  { slug: 'cfao-motors-ci', ticker: 'CFAC', name: 'CFAO Motors CI', full_name: 'CFAO Motors Côte d\'Ivoire', country: 'CI', sector: 'Distribution', market: 'actions', indices: ['BRVM-C'], aliases: ['CFAO Motors', 'CFAC'] },
  { slug: 'tractafric-motors-ci', ticker: 'PRSC', name: 'Tractafric Motors CI', full_name: 'Tractafric Motors CI', country: 'CI', sector: 'Distribution', market: 'actions', indices: ['BRVM-C'], aliases: ['PRSC'] },
  { slug: 'bernabe-ci', ticker: 'BNBC', name: 'Bernabe CI', full_name: 'Bernabe Côte d\'Ivoire', country: 'CI', sector: 'Distribution', market: 'actions', indices: ['BRVM-C'], aliases: ['Bernabe', 'BNBC'] },
  { slug: 'servair-abidjan-ci', ticker: 'ABJC', name: 'Servair Abidjan', full_name: 'Servair Abidjan', country: 'CI', sector: 'Services', market: 'actions', indices: ['BRVM-C'], aliases: ['Servair', 'ABJC'] },
  { slug: 'setao-ci', ticker: 'STAC', name: 'Setao', full_name: 'Setao', country: 'CI', sector: 'BTP', market: 'actions', indices: ['BRVM-C'], aliases: ['SETAO', 'STAC'] },
  { slug: 'unilever-ci', ticker: 'UNLC', name: 'Unilever CI', full_name: 'Unilever Côte d\'Ivoire', country: 'CI', sector: 'Biens de consommation', market: 'actions', indices: ['BRVM-C'], aliases: ['Unilever', 'UNLC'] },
]

export function defaultEmetteursSeedCount(): number {
  return EMETTEURS_SEED.length
}
