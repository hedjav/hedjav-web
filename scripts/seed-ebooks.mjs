#!/usr/bin/env node
/**
 * Seed des ebooks dans Supabase.
 * Prérequis : la migration 001_ebooks.sql doit avoir été exécutée
 *             dans Supabase Dashboard → SQL Editor.
 *
 * Usage : node scripts/seed-ebooks.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Charge .env.local manuellement (pas de dotenv)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Cover ebook 1 — fichier JPG à la racine de /public (avec espaces et accents)
const COVER_EBOOK_1 = "/Propulser votre carrière et votre business grâce à l'IA.jpg"

const ebooks = [
  {
    title: "Propulsez votre carrière et votre business grâce à l'IA : 50 prompts professionnels prêts à l'emploi pour travailler 10X plus vite avec l'intelligence artificielle",
    slug: 'propulser-ia',
    short_description:
      "Plus de 300 prompts professionnels prêts à l'emploi, structurés avec le framework C-A-F-É, pour faire de l'IA votre avantage compétitif au quotidien.",
    description: `Cet ebook pratique vous permet d'exploiter pleinement le potentiel de l'intelligence artificielle dans votre quotidien professionnel.

À travers plus de 300 prompts prêts à l'emploi, structurés avec le framework C-A-F-É (Contexte, Action, Format, Évaluation), vous apprenez à générer rapidement des contenus de qualité, automatiser vos tâches et prendre de meilleures décisions.

Conçu pour les entrepreneurs, salariés, freelances et étudiants, il couvre plus de 50 métiers dans 10 secteurs d'activité.

Chaque prompt est directement applicable pour produire des résultats concrets en quelques minutes.

Un guide essentiel pour gagner du temps, améliorer votre performance et faire de l'IA un véritable levier de productivité.

Pourquoi cet ebook est différent ?
Contrairement aux contenus théoriques, cet ebook est conçu pour passer à l'action immédiatement :
• Générez des résultats en moins de 15 minutes
• Automatisez vos tâches répétitives
• Créez du contenu de qualité professionnelle
• Prenez de meilleures décisions avec l'IA

Chaque prompt est testé, optimisé et applicable dans la vraie vie.

Résultat
Avec ce guide, vous devenez un professionnel augmenté :
• Travaillez 2 à 5 fois plus vite
• Améliorez la qualité de vos livrables
• Multipliez votre productivité sans travailler plus

Objectif : faire de l'intelligence artificielle votre avantage compétitif.`,
    price: 4900,
    original_price: 15000,
    cover_image_url: COVER_EBOOK_1,
    fedapay_link: 'https://me.fedapay.com/propulser-ia',
    features: [
      "300+ prompts professionnels prêts à l'emploi",
      '50 métiers couverts (marketing, tech, RH, business, éducation, santé…)',
      "Framework exclusif C-A-F-É pour maîtriser l'IA efficacement",
      'Outils IA 2026 + stratégies concrètes',
      'Workflows & automatisation sans code',
    ],
    target_audience: [
      'Entrepreneurs & startups',
      'Freelances & créateurs',
      'Salariés & managers',
      'Étudiants & professionnels en reconversion',
    ],
    is_featured: true,
  },

  {
    title: 'Maîtriser la BRVM : investir en bourse régionale pas à pas',
    slug: 'maitriser-la-brvm',
    short_description:
      "Le guide complet pour ouvrir votre compte titres, comprendre les indices BRVM 10 et BRVM Composite et bâtir un portefeuille rentable d'actions UEMOA.",
    description: `La Bourse Régionale des Valeurs Mobilières (BRVM) reste la grande inconnue du grand public ouest-africain. Pourtant, c'est l'un des leviers les plus puissants pour faire fructifier son épargne en zone UEMOA.

Cet ebook vous prend par la main, du premier compte titres jusqu'à la construction d'un portefeuille équilibré. Vous découvrirez :

• Comment fonctionne réellement la BRVM (indices, capitalisation, secteurs)
• Le processus exact pour ouvrir un compte titres auprès d'une SGI agréée
• Les ratios financiers à analyser avant chaque achat
• Les pièges classiques de l'investisseur débutant
• Une méthode simple pour suivre vos positions

Conçu pour les particuliers de Côte d'Ivoire, du Bénin, du Sénégal, du Togo, du Burkina Faso, du Mali, du Niger et de la Guinée-Bissau.`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/maitriser-la-brvm.svg',
    fedapay_link: 'https://me.fedapay.com/maitriser-la-brvm',
    features: [
      'Ouvrir son compte titres en 7 jours',
      'Analyser les sociétés cotées BRVM',
      'Construire un portefeuille équilibré',
      'Comprendre les indices BRVM 10 et Composite',
      'Suivre la fiscalité des dividendes en UEMOA',
    ],
    target_audience: [
      'Salariés qui veulent faire travailler leur épargne',
      'Diaspora africaine cherchant à investir au pays',
      'Jeunes professionnels désireux de comprendre la bourse',
      'Entrepreneurs souhaitant diversifier leurs actifs',
    ],
    is_featured: true,
  },

  {
    title: 'Construire son patrimoine en UEMOA',
    slug: 'patrimoine-uemoa',
    short_description:
      "Une feuille de route claire pour bâtir, structurer et transmettre votre patrimoine dans les huit pays de l'UEMOA.",
    description: `Construire un patrimoine solide en Afrique francophone demande de comprendre des règles spécifiques : OHADA, fiscalité locale, droit familial, transmission. Cet ebook vous donne le cadre complet.

Vous apprendrez à :

• Définir vos objectifs patrimoniaux à 5, 10 et 20 ans
• Répartir vos actifs entre immobilier, BRVM, épargne et entreprise
• Comprendre les régimes matrimoniaux et leur impact
• Anticiper la transmission à vos enfants
• Éviter les erreurs classiques (prête-noms, mélange perso/pro, absence de testament)

Un guide pensé pour la réalité africaine, loin des recettes occidentales hors-sol.`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/patrimoine-uemoa.svg',
    fedapay_link: 'https://me.fedapay.com/patrimoine-uemoa',
    features: [
      'Cartographie complète des classes d\'actifs en UEMOA',
      'Modèle d\'allocation patrimoniale par tranche d\'âge',
      'Cadre juridique OHADA expliqué simplement',
      'Stratégies de transmission et succession',
      'Checklist annuelle de revue patrimoniale',
    ],
    target_audience: [
      'Cadres et professions libérales',
      'Chefs d\'entreprise UEMOA',
      'Familles avec enfants à charge',
      'Diaspora préparant le retour au pays',
    ],
    is_featured: true,
  },

  {
    title: 'Du salaire au revenu passif : 7 leviers en Afrique',
    slug: 'revenu-passif-afrique',
    short_description:
      "Sept stratégies concrètes et adaptées au contexte africain pour générer des revenus qui tombent même quand vous dormez.",
    description: `Beaucoup rêvent de revenus passifs sans savoir par où commencer. Cet ebook démystifie la notion et propose 7 leviers réalistes en Afrique francophone, avec capital de départ accessible.

• Location courte durée (Airbnb local, colocations meublées)
• Dividendes BRVM
• Produits numériques (ebooks, formations, templates)
• Affiliation et marketing de contenu
• Petits commerces semi-automatisés
• Prêt rémunéré entre particuliers (cadre légal)
• Royalties et droits d'auteur

Pour chaque levier : capital nécessaire, temps de mise en place, risques, rendement attendu et pièges à éviter.`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/revenu-passif-afrique.svg',
    fedapay_link: 'https://me.fedapay.com/revenu-passif-afrique',
    features: [
      '7 leviers détaillés avec capital et rendement',
      'Études de cas réels en Afrique francophone',
      'Plan d\'action 90 jours',
      'Templates de suivi de revenus',
      'Erreurs à éviter pour chaque levier',
    ],
    target_audience: [
      'Salariés qui veulent diversifier leurs revenus',
      'Entrepreneurs en quête de revenus récurrents',
      'Personnes proches de la retraite',
      'Jeunes actifs ambitieux',
    ],
    is_featured: false,
  },

  {
    title: "Immobilier locatif en UEMOA : Bénin & Côte d'Ivoire",
    slug: 'immobilier-locatif-uemoa',
    short_description:
      "Tout ce qu'il faut savoir pour investir dans l'immobilier locatif rentable à Cotonou, Abidjan et les villes secondaires de la zone UEMOA.",
    description: `L'immobilier locatif reste le placement préféré des familles ouest-africaines. Mais entre les mauvais quartiers, les locataires impayeurs et les taxes mal anticipées, beaucoup s'y brûlent les ailes.

Ce guide pratique couvre :

• Comment évaluer un bien (rendement brut, net, charges réelles)
• Les meilleurs quartiers émergents à Cotonou et Abidjan
• Le cadre juridique du bail commercial et résidentiel OHADA
• La gestion locative : gérer soi-même ou déléguer ?
• Le financement bancaire : conditions réelles, alternatives
• La fiscalité immobilière par pays`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/immobilier-locatif-uemoa.svg',
    fedapay_link: 'https://me.fedapay.com/immobilier-locatif-uemoa',
    features: [
      'Évaluer la rentabilité réelle d\'un bien',
      'Cartographie des quartiers porteurs',
      'Modèles de baux conformes OHADA',
      'Stratégies de financement bancaire',
      'Optimisation fiscale par pays',
    ],
    target_audience: [
      'Primo-investisseurs immobiliers',
      'Diaspora investissant à distance',
      'Bailleurs déjà établis souhaitant optimiser',
      'Cadres préparant leur retraite',
    ],
    is_featured: false,
  },

  {
    title: 'Finances personnelles de la famille africaine',
    slug: 'finances-personnelles-famille',
    short_description:
      "Un guide pratique pour reprendre le contrôle du budget familial, sortir des dettes et bâtir un avenir serein, adapté à la réalité africaine.",
    description: `La gestion d'un budget familial en Afrique francophone obéit à des contraintes uniques : sollicitations familiales, économie informelle, accès limité au crédit, tontines, charges scolaires lourdes.

Cet ebook propose une méthode concrète pour :

• Construire un budget familial réaliste
• Sortir des dettes (crédit conso, microcrédit, dettes familiales)
• Mettre en place un fonds d'urgence en 12 mois
• Préparer la rentrée scolaire sans stress
• Gérer les sollicitations familiales sans culpabilité
• Épargner même avec un petit revenu`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/finances-personnelles-famille.svg',
    fedapay_link: 'https://me.fedapay.com/finances-personnelles-famille',
    features: [
      'Méthode budgétaire 50/30/20 adaptée Afrique',
      'Plan de désendettement boule de neige',
      'Fonds d\'urgence en 12 mois étape par étape',
      'Scripts pour gérer les demandes familiales',
      'Modèles Excel & Google Sheets inclus',
    ],
    target_audience: [
      'Couples avec enfants',
      'Mères de famille gestionnaires du budget',
      'Jeunes actifs en début de carrière',
      'Familles surendettées cherchant une issue',
    ],
    is_featured: false,
  },

  {
    title: 'Entreprendre sans capital en Afrique francophone',
    slug: 'entreprendre-sans-capital',
    short_description:
      "Lancer votre activité avec moins de 50 000 FCFA : 12 modèles d'affaires testés et validés en Afrique francophone.",
    description: `Vous n'avez pas besoin d'un million pour démarrer. Cet ebook recense 12 modèles d'affaires que vous pouvez lancer avec moins de 50 000 FCFA, en parallèle de votre emploi actuel.

Pour chaque modèle :

• Investissement de départ exact
• Temps requis par semaine
• Premiers clients : où les trouver ?
• Marges et chiffre d'affaires réaliste à 3, 6, 12 mois
• Outils gratuits ou peu chers
• Témoignages d'entrepreneurs ayant réussi

Du service à domicile au e-commerce micro-niche, en passant par la formation en ligne et le conseil, vous trouverez forcément un modèle qui colle à vos compétences.`,
    price: 4900,
    original_price: 15000,
    cover_image_url: '/ebooks/entreprendre-sans-capital.svg',
    fedapay_link: 'https://me.fedapay.com/entreprendre-sans-capital',
    features: [
      '12 modèles d\'affaires avec moins de 50 000 FCFA',
      'Plans d\'action 90 jours par modèle',
      'Outils gratuits indispensables',
      'Stratégies d\'acquisition de premiers clients',
      'Témoignages réels d\'entrepreneurs',
    ],
    target_audience: [
      'Salariés voulant lancer un side business',
      'Étudiants entrepreneurs',
      'Personnes en reconversion',
      'Demandeurs d\'emploi',
    ],
    is_featured: false,
  },
]

async function main() {
  console.log(`→ Seeding ${ebooks.length} ebooks…`)
  const { data, error } = await supabase
    .from('ebooks')
    .upsert(ebooks, { onConflict: 'slug' })
    .select('slug, title')

  if (error) {
    console.error('❌ Seed failed:', error.message)
    process.exit(1)
  }

  for (const row of data ?? []) console.log(`  ✓ ${row.slug}`)
  console.log(`✅ Done — ${data?.length ?? 0} rows upserted.`)
}

main()
