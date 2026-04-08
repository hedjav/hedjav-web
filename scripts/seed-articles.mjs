#!/usr/bin/env node
/**
 * Seed des articles de blog dans Supabase.
 * Prérequis : la migration 002_articles.sql doit avoir été exécutée
 *             dans Supabase Dashboard → SQL Editor.
 *
 * Usage : node scripts/seed-articles.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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

const now = new Date().toISOString()

const articles = [
  {
    title: 'Comment ouvrir son compte titres BRVM en 2026',
    slug: 'ouvrir-compte-titres-brvm-2026',
    excerpt:
      "Le guide pratique étape par étape pour ouvrir son compte titres auprès d'une SGI agréée et commencer à investir sur la BRVM en moins de 7 jours.",
    body: `## Pourquoi ouvrir un compte titres aujourd'hui ?

La Bourse Régionale des Valeurs Mobilières (BRVM) est l'une des rares opportunités d'investissement régulées et liquides accessibles aux particuliers de l'UEMOA. Pourtant, **moins de 0,5 % de la population active** détient un compte titres dans la zone.

La barrière n'est pas financière. C'est une barrière d'information.

## Étape 1 — Choisir une SGI agréée

Une SGI (Société de Gestion et d'Intermédiation) est l'intermédiaire obligatoire pour acheter des actions sur la BRVM. Toutes les SGI sont agréées par le CREPMF.

Critères de choix :

- **Frais de courtage** (entre 0,5 % et 1,2 % par opération)
- **Frais de tenue de compte** annuels
- **Plateforme en ligne** disponible ou non
- **Service client** réactif (à tester avant d'ouvrir)

> Astuce : demandez les frais par écrit. Certaines SGI annoncent des frais bas mais facturent des « frais administratifs » cachés.

## Étape 2 — Préparer ses documents

Les documents demandés sont standards dans toute la zone UEMOA :

1. Pièce d'identité en cours de validité (CNI ou passeport)
2. Justificatif de domicile de moins de 3 mois
3. Justificatif de revenus (bulletin de salaire, déclaration fiscale)
4. RIB d'un compte bancaire dans l'UEMOA
5. Photo d'identité

## Étape 3 — Effectuer le premier dépôt

Le dépôt minimum varie selon la SGI : **généralement entre 50 000 et 200 000 FCFA**. Ce montant n'est pas immobilisé : il sert à acheter vos premières actions.

Conseil : ne déposez que ce que vous êtes prêt à laisser investi pendant 3 à 5 ans minimum.

## Étape 4 — Passer son premier ordre

Trois types d'ordres existent :

- **Au marché** — exécution immédiate au meilleur prix disponible
- **À cours limité** — vous fixez un prix maximum d'achat
- **À déclenchement** — l'ordre se déclenche si une condition de prix est atteinte

Pour un premier ordre, privilégiez **l'ordre à cours limité** : vous gardez le contrôle du prix payé.

## Combien de temps ça prend ?

En pratique, en 2026, une ouverture de compte titres complète prend **5 à 10 jours ouvrés** entre la collecte des documents, la validation par la SGI et l'activation du compte.

Une fois actif, vos ordres sont exécutés en quelques minutes pendant les heures de marché (9h-15h GMT, du lundi au vendredi).

## Et après ?

Ouvrir le compte n'est que la première étape. La vraie compétence, c'est **savoir quoi acheter et quand**. Suivez nos prochains articles pour bâtir une stratégie d'investissement adaptée à votre profil.
`,
    category: 'BRVM',
    cover_image_url: '/blog/brvm-compte-titres.svg',
    published_at: now,
    featured: true,
    is_published: true,
    created_by: 'hermann',
    source: 'manual',
    quality_score: null,
  },

  {
    title: 'Les 5 erreurs patrimoniales des cadres ouest-africains',
    slug: 'erreurs-patrimoniales-cadres-ouest-africains',
    excerpt:
      "Mélange perso/pro, absence de testament, sur-investissement immobilier… Voici les cinq pièges qui détruisent silencieusement le patrimoine des cadres en zone UEMOA.",
    body: `Après plus d'une décennie à accompagner des cadres de Cotonou, Abidjan, Dakar et Lomé, j'observe les mêmes erreurs se répéter. Elles ne viennent pas d'un manque d'argent, mais d'un manque de structuration.

## Erreur 1 — Mélanger comptes personnels et professionnels

C'est le piège le plus courant. Le compte bancaire personnel sert aussi à recevoir les factures clients, à payer les fournisseurs, à acheter le carburant de la voiture utilisée pour les déplacements pro.

**Conséquence** : impossible de connaître votre vraie rentabilité, contrôle fiscal douloureux, et patrimoine personnel exposé en cas de litige professionnel.

> La règle d'or : **un compte par activité**, et des virements documentés entre les deux.

## Erreur 2 — Tout miser sur l'immobilier

L'immobilier locatif est rassurant. Mais quand 80 % de votre patrimoine est dans des biens situés dans la même ville, vous portez un risque de concentration énorme.

Que se passe-t-il si :

- Le marché locatif s'effondre dans votre quartier ?
- Une expropriation administrative survient ?
- Une catastrophe climatique frappe la zone ?

**Diversifiez** : BRVM, épargne sécurisée, parts dans une entreprise productive, immobilier dans plusieurs zones géographiques.

## Erreur 3 — Ne pas avoir de testament

En zone OHADA, l'absence de testament déclenche automatiquement les règles de succession légale. Ces règles sont souvent **éloignées de vos vraies intentions**, surtout en cas de famille recomposée.

Un testament olographe (écrit à la main, daté, signé) suffit pour la plupart des situations. Coût : zéro. Bénéfice : protection totale de vos proches.

## Erreur 4 — Sous-estimer l'inflation

L'inflation annuelle moyenne en zone UEMOA se situe entre 3 % et 5 %. **Sur 20 ans, votre épargne en compte courant perd la moitié de sa valeur réelle.**

Solutions :

- BRVM (rendements historiques 6-8 % par an)
- Or physique (réserve de valeur)
- Immobilier (avec les précautions de l'erreur 2)
- Parts d'entreprises productives

## Erreur 5 — Penser « patrimoine » uniquement à 50 ans

Le piège classique : « je commencerai à m'occuper de mon patrimoine quand j'aurai plus d'argent ».

C'est exactement l'inverse qui marche. **Plus vous commencez tôt, moins vous avez besoin d'argent**, grâce à l'effet des intérêts composés.

Investir 50 000 FCFA par mois à 30 ans à 7 % de rendement annuel produit **plus que** 200 000 FCFA par mois investis à partir de 50 ans, sur le même horizon final.

## En résumé

Ces cinq erreurs ne sont pas des fatalités. Elles se corrigent toutes en quelques semaines, à condition d'en prendre conscience. Si vous vous reconnaissez dans une seule d'entre elles, considérez que cet article est votre signal.
`,
    category: 'Patrimoine',
    cover_image_url: '/blog/erreurs-patrimoniales.svg',
    published_at: now,
    featured: true,
    is_published: true,
    created_by: 'hermann',
    source: 'manual',
    quality_score: null,
  },

  {
    title: '5 prompts ChatGPT pour analyser vos finances personnelles',
    slug: '5-prompts-chatgpt-finances-personnelles',
    excerpt:
      "Cinq prompts éprouvés pour faire de ChatGPT votre conseiller financier personnel : analyse de relevés, simulation d'épargne, négociation et plus encore.",
    body: `L'IA générative n'est pas réservée aux développeurs. Bien utilisée, elle peut devenir votre **conseiller financier personnel**, disponible 24/7 et gratuit. Voici 5 prompts à copier-coller dès maintenant.

## Prompt 1 — Analyser un relevé bancaire

\`\`\`
Tu es un conseiller financier. Voici mon relevé bancaire des 30 derniers
jours [collez les opérations]. Identifie :
1. Mes 3 plus grosses catégories de dépenses
2. Les abonnements potentiellement inutiles
3. Une fuite d'argent que je n'ai probablement pas remarquée
Réponds en français, en moins de 200 mots, avec des chiffres précis.
\`\`\`

**Pourquoi ça marche** : ChatGPT est excellent en classification. Il repère en 5 secondes ce qui vous prendrait une heure à analyser manuellement.

## Prompt 2 — Simuler un objectif d'épargne

\`\`\`
Je veux épargner [MONTANT] FCFA d'ici [ÉCHÉANCE]. Mon revenu net mensuel
est de [MONTANT]. Mes dépenses fixes sont [MONTANT].

Calcule :
1. Combien je dois épargner par mois
2. Le pourcentage de mon revenu disponible que ça représente
3. 3 leviers concrets pour y arriver sans réduire ma qualité de vie
\`\`\`

## Prompt 3 — Négocier un crédit

\`\`\`
Je négocie un prêt [MONTANT] sur [DURÉE] mois avec ma banque. Le taux
proposé est [TAUX]%. Donne-moi :
1. Les arguments factuels pour demander une baisse de 0,5 point
2. 3 phrases exactes à dire au conseiller
3. Le coût total du crédit avant et après négociation
\`\`\`

## Prompt 4 — Comparer 2 placements

\`\`\`
Compare ces 2 placements pour un horizon de [DURÉE] ans :
- Placement A : [DESCRIPTION + RENDEMENT + RISQUES]
- Placement B : [DESCRIPTION + RENDEMENT + RISQUES]

Pour chacun : rendement net espéré, risque principal, liquidité,
fiscalité en zone UEMOA. Conclus avec une recommandation argumentée.
\`\`\`

## Prompt 5 — Préparer un budget familial

\`\`\`
Je dois construire un budget familial mensuel pour une famille de
[NOMBRE] personnes vivant à [VILLE]. Revenu net : [MONTANT] FCFA.

Propose une répartition réaliste en pourcentages, basée sur la méthode
50/30/20 adaptée au contexte ouest-africain (sollicitations familiales,
charges scolaires, transport informel).
\`\`\`

## Les règles d'or

1. **Ne donnez jamais de données nominatives** (numéros de compte, noms de proches)
2. **Demandez des chiffres**, pas des généralités
3. **Vérifiez toujours** les calculs critiques avec une calculatrice
4. **Itérez** : reformulez si la première réponse n'est pas assez précise

L'IA ne remplace pas un conseiller en chair et en os. Mais pour 90 % des décisions financières du quotidien, elle est **meilleure que rien** — et elle ne vous coûtera jamais une commission.
`,
    category: 'IA & productivité',
    cover_image_url: '/blog/ia-finance-perso.svg',
    published_at: now,
    featured: true,
    is_published: true,
    created_by: 'hermann',
    source: 'manual',
    quality_score: null,
  },
]

async function main() {
  console.log(`→ Seeding ${articles.length} articles…`)
  const { data, error } = await supabase
    .from('articles')
    .upsert(articles, { onConflict: 'slug' })
    .select('slug, title')

  if (error) {
    console.error('❌ Seed failed:', error.message)
    process.exit(1)
  }

  for (const row of data ?? []) console.log(`  ✓ ${row.slug}`)
  console.log(`✅ Done — ${data?.length ?? 0} rows upserted.`)
}

main()
