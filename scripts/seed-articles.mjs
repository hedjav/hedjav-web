#!/usr/bin/env node
/**
 * Seed d'articles editoriaux pour le blog Hedjav / EGP.
 *
 * Objectif : fournir une base editoriale credible, couvrant
 * les 6 axes definis (BRVM, Patrimoine, Finance personnelle,
 * Immobilier, Entrepreneuriat, IA & productivite).
 *
 * Usage : node scripts/seed-articles.mjs
 * Prerequis : migration 002_articles.sql appliquee.
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
  console.error('Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const AUTHOR = 'Hermann D. AVAHOUIN'
const NOW = new Date().toISOString()

const articles = [
  {
    title: 'BRVM : ouvrir un compte-titres étape par étape en 2026',
    slug: 'ouvrir-compte-titres-brvm-2026',
    category: 'BRVM',
    cover_image_url: null,
    featured: true,
    excerpt:
      "Le guide pas-à-pas pour ouvrir un compte-titres à la BRVM en zone UEMOA, choisir sa SGI, comprendre les frais et passer son premier ordre sereinement.",
    body: `Investir à la BRVM (Bourse Régionale des Valeurs Mobilières) est à la portée de tout résident de la zone UEMOA — à condition de savoir par où commencer. Ce guide reprend la procédure réelle, sans jargon.

## 1. Comprendre le rôle d'une SGI

Contrairement à ce que pensent beaucoup de nouveaux investisseurs, on n'ouvre pas un compte "à la BRVM". On ouvre un compte-titres auprès d'une **Société de Gestion et d'Intermédiation (SGI)** agréée par le CREPMF. La SGI est l'intermédiaire qui exécute vos ordres d'achat ou de vente sur le marché.

Au 1er trimestre 2026, on compte une vingtaine de SGI actives dans la zone UEMOA. Les plus connues sont présentes dans plusieurs pays : BOA Capital Securities, CGF Bourse, Hudson & Cie, SGI Togo, entre autres.

## 2. Choisir sa SGI : 4 critères concrets

Avant de choisir :

1. **Accessibilité physique et digitale** : agence proche de chez vous, ou dossier 100 % en ligne ?
2. **Montant minimum d'ouverture** : la plupart demandent entre 50 000 et 250 000 FCFA de versement initial.
3. **Grille tarifaire** : commissions de courtage (0,7 % à 1,2 % du montant), frais de garde annuels, frais fixes de souscription.
4. **Qualité du reporting** : relevés mensuels clairs, accès web/mobile à votre portefeuille, délai d'exécution.

Demandez toujours la grille tarifaire par écrit avant de signer. Ce document sert de référence en cas de litige.

## 3. Le dossier d'ouverture — pièces à préparer

Pour un particulier résident :

- **Pièce d'identité** en cours de validité (CNI, passeport)
- **Justificatif de domicile** de moins de 3 mois (facture électricité, eau, ou attestation)
- **Attestation fiscale** ou numéro IFU (selon SGI)
- **RIB bancaire** du compte qui servira aux mouvements
- **Convention d'ouverture de compte-titres** (fournie par la SGI, à lire intégralement)
- **Fiche KYC** et questionnaire de profil investisseur

Comptez 5 à 15 jours ouvrés entre le dépôt du dossier et l'activation effective du compte.

## 4. Alimenter le compte et passer son premier ordre

Une fois le compte actif, vous virez vos fonds depuis votre compte bancaire vers le compte de marché ouvert à votre nom chez la SGI. Le délai de crédit est généralement de 24 à 48 heures.

Pour un premier ordre, privilégiez un **ordre à cours limité** plutôt qu'un "au marché". Concrètement : vous dites à la SGI "j'achète jusqu'à 10 000 FCFA par action, pas au-delà". Cela vous protège contre une exécution à un prix défavorable en cas de faible liquidité — une réalité sur plusieurs titres BRVM.

## 5. Erreurs fréquentes à éviter

- **Confondre compte-titres et compte épargne** : l'argent sur un compte-titres est investi en actions/obligations, il n'est pas rémunéré comme un livret.
- **Concentrer tout son portefeuille sur un seul titre** : la diversification est la règle de base, même avec un petit portefeuille.
- **Négliger les commissions** : sur de petits montants, elles peuvent manger 2 à 3 % de votre performance annuelle.
- **Oublier la fiscalité** : dividendes et plus-values sont soumis à une fiscalité spécifique selon votre pays de résidence.

## 6. Et après ?

Ouvrir un compte-titres est une étape. La vraie question commence après : **que mettre dedans, et avec quelle discipline ?** C'est tout l'objet de nos ebooks et formations BRVM sur EGP.

---

*Envie d'aller plus loin ? Notre ebook "Bourse régionale : comprendre et investir à la BRVM" détaille l'analyse fondamentale des émetteurs cotés et propose des stratégies concrètes pour un portefeuille UEMOA.*`,
    is_published: true,
    published_at: NOW,
  },

  {
    title: '5 erreurs patrimoniales que font les cadres africains avant 40 ans',
    slug: 'erreurs-patrimoine-cadres-afrique-avant-40-ans',
    category: 'Patrimoine',
    cover_image_url: null,
    featured: true,
    excerpt:
      "Après 13 ans à conseiller des cadres et entrepreneurs en Afrique de l'Ouest, j'ai identifié 5 erreurs récurrentes qui coûtent cher — et la bonne nouvelle, c'est qu'elles sont toutes évitables.",
    body: `Une carrière réussie ne suffit pas à bâtir un patrimoine. J'en ai vu trop d'exemples : revenus élevés, train de vie confortable, et à 45 ans, un bilan patrimonial proche de zéro. Voici les 5 erreurs que je rencontre le plus souvent.

## 1. Confondre "revenu" et "patrimoine"

Beaucoup de cadres bien payés pensent qu'ils sont "riches" parce qu'ils gagnent bien. C'est une illusion. Le revenu est un flux (ce qui entre chaque mois). Le patrimoine est un **stock** (ce que vous possédez vraiment : biens, actifs financiers, moins vos dettes).

Un cadre qui gagne 3 millions FCFA par mois mais dépense tout, et qui n'a aucun actif, est dans une position patrimoniale plus fragile qu'un artisan discret qui possède son atelier et deux maisons payées.

**À retenir** : ce n'est pas ce que vous gagnez qui compte, c'est ce que vous **conservez** et **faites travailler**.

## 2. Retarder l'épargne "en attendant d'avoir plus"

L'erreur classique : "je commencerai à épargner quand j'aurai une augmentation". Sauf que quand l'augmentation arrive, les dépenses suivent. C'est le fameux **train de vie expansif**.

La règle simple : épargnez **en premier**, pas ce qui reste. Même 10 % du revenu mensuel, automatisés dès la réception du salaire, crée en quelques années une base patrimoniale significative grâce à la capitalisation.

## 3. Tout miser sur l'immobilier

En Afrique francophone, l'immobilier est culturellement perçu comme **le** placement patrimonial. Résultat : beaucoup de cadres concentrent 80 à 100 % de leur patrimoine dans une ou deux maisons.

Deux problèmes :

- **Illiquidité** : en cas de besoin urgent, vendre une maison prend 6 à 18 mois.
- **Risque de concentration** : un quartier qui se dégrade, et votre patrimoine entier perd de la valeur.

Diversifier avec des actions BRVM, des obligations, de l'épargne disponible et, selon votre profil, une assurance-vie, n'est pas un luxe : c'est une règle de bonne gestion.

## 4. Ignorer le cadre juridique et fiscal

Acheter une maison au nom de qui ? Sous quel régime matrimonial ? Avec ou sans démembrement ? Que se passe-t-il si vous décédez demain ?

Trop de patrimoines se retrouvent bloqués pendant des années dans des successions mal préparées, parfois avec des conflits familiaux douloureux. Le cadre OHADA offre des outils de structuration (SCI, indivision organisée, testament authentique) encore peu exploités.

Un patrimoine non structuré juridiquement, c'est un patrimoine fragile.

## 5. Ne jamais se former sérieusement à la finance

C'est probablement la racine des 4 erreurs précédentes. On nous apprend à gagner de l'argent (via le métier) mais rarement à **gérer** l'argent une fois gagné.

La bonne nouvelle : se former à la finance personnelle et patrimoniale demande moins de temps qu'on ne croit. Quelques livres solides, quelques formations ciblées, et des conseils avisés suffisent à poser les bases pour 20 ans.

C'est précisément la raison d'être d'EGP : rendre accessible une expertise longtemps réservée à une minorité.

---

*Vous vous reconnaissez dans une ou plusieurs de ces erreurs ? Commencez par notre ebook "Erreurs patrimoniales à éviter avant 40 ans en zone UEMOA", disponible sur le catalogue EGP.*`,
    is_published: true,
    published_at: NOW,
  },

  {
    title: "5 prompts IA indispensables pour un entrepreneur en zone UEMOA",
    slug: 'prompts-ia-entrepreneur-uemoa',
    category: 'IA & productivité',
    cover_image_url: null,
    featured: true,
    excerpt:
      "ChatGPT, Claude, Gemini : les LLM sont devenus des assistants redoutables quand on sait quoi leur demander. Voici 5 prompts opérationnels, testés sur des dossiers réels de dirigeants UEMOA.",
    body: `L'intelligence artificielle n'est pas un gadget. C'est un levier de productivité concret pour tout entrepreneur. Encore faut-il savoir quoi demander. Voici 5 prompts que j'utilise régulièrement dans mes propres dossiers KTALYZ et que je vous partage tels quels.

## 1. Le prompt "analyse de contrat rapide"

> *"Tu es un juriste d'affaires spécialisé OHADA. Je vais te transmettre un projet de contrat commercial. Ton job : identifier les 5 clauses les plus risquées pour ma partie, expliquer pourquoi, et proposer une reformulation en 2 phrases maximum par clause. Utilise un tableau à 3 colonnes : Clause / Risque / Reformulation proposée."*

**Usage** : gain de temps massif sur la pré-lecture d'un contrat avant de le soumettre à votre conseil juridique. Vous arrivez chez l'avocat avec des questions précises, pas avec un document vierge.

## 2. Le prompt "note de synthèse"

> *"Voici [X pages] de documentation sur le projet [nom]. Rédige-moi une note de synthèse de 1 page, en français professionnel, structurée ainsi : (1) enjeu en 2 phrases, (2) 3 points clés à connaître, (3) 3 risques principaux, (4) 3 recommandations opérationnelles. Tonalité : factuelle, pas de superlatifs."*

**Usage** : transformer 40 pages de rapport en 1 page de décision exploitable.

## 3. Le prompt "simulation financière"

> *"J'envisage l'opération suivante : [décrire l'opération en 3-4 lignes avec les montants en FCFA]. Construis 3 scénarios (pessimiste / médian / optimiste) sur 5 ans, avec : investissement initial, revenus projetés année par année, charges, résultat net, TRI. Liste ensuite les 3 hypothèses les plus sensibles du modèle."*

**Usage** : valider rapidement une intuition avant de lancer une étude approfondie. Attention : l'IA peut se tromper sur les chiffres, toujours recalculer à la fin. Mais elle pose correctement le cadre.

## 4. Le prompt "email difficile"

> *"Je dois écrire un email à [rôle du destinataire] pour lui dire que [situation délicate en 2-3 lignes]. Tonalité : ferme mais respectueuse, cadre culturel africain francophone professionnel. Propose-moi 3 versions : directe, diplomate, formelle. Maximum 150 mots chacune."*

**Usage** : gérer les moments où il faut dire non à un client important, recadrer un collaborateur senior, ou négocier une prolongation de délai. L'IA vous fait gagner la première heure de rédaction.

## 5. Le prompt "questions à se poser"

> *"Je m'apprête à [décision importante en 1-2 lignes]. Pose-moi les 10 questions que poserait un consultant stratégique expérimenté avant de valider cette décision. Classe-les par ordre d'importance."*

**Usage** : le plus puissant des cinq. Au lieu de demander une réponse, on demande à l'IA d'être votre **sparring-partner**. Elle n'a pas votre contexte, mais elle pose souvent les bonnes questions de cadrage.

## Trois règles d'or en prompt engineering

1. **Donnez toujours un rôle à l'IA** (expert comptable, juriste, CFO, etc.). La qualité de la réponse dépasse largement celle d'une question floue.
2. **Précisez le format de sortie attendu** (tableau, bullet points, longueur). Sans cela, vous obtiendrez du texte générique.
3. **Ne faites jamais confiance aveuglément aux chiffres** que l'IA produit. Elle peut halluciner sur des calculs ou des références. Vérifiez systématiquement les montants et les sources.

---

*Envie d'aller plus loin ? Notre ebook phare "Propulsez votre carrière et votre business grâce à l'IA" contient plus de 300 prompts professionnels structurés avec le framework C-A-F-É.*`,
    is_published: true,
    published_at: NOW,
  },

  {
    title: "Immobilier locatif UEMOA : 4 critères avant d'acheter",
    slug: 'immobilier-locatif-uemoa-4-criteres',
    category: 'Immobilier',
    cover_image_url: null,
    featured: false,
    excerpt:
      "Avant d'engager 25, 50 ou 100 millions FCFA dans un bien locatif, il y a quatre critères qu'il faut absolument valider. Sous peine de transformer un placement en gouffre.",
    body: `L'immobilier locatif reste l'un des placements patrimoniaux préférés en zone UEMOA. À juste titre : tangible, culturellement valorisé, potentiellement rentable. Mais j'ai vu trop d'investisseurs découvrir trop tard que leur "bien locatif" était en réalité un boulet.

## Critère 1 — L'emplacement, mais au sens propre

"L'emplacement, l'emplacement, l'emplacement." Le cliché cache une vérité : en UEMOA, il n'y a pas **un** emplacement, il y en a **trois couches** à valider.

- **Emplacement macro** : ville et quartier. Dynamique démographique, projets d'infrastructure à 5-10 ans.
- **Emplacement micro** : rue et voisinage immédiat. Accès, sécurité réelle, nuisances.
- **Emplacement juridique** : statut du terrain. ACD (Acte de Cession Définitive) ? Permis d'habiter ? Titre foncier en bonne et due forme ? En zone UEMOA, un bien sans titre propre vaut la moitié de sa valeur faciale.

## Critère 2 — Le rendement locatif net réel

Le vendeur vous annoncera un **rendement brut** ("5 millions FCFA de loyer annuel sur un bien à 50 millions, ça fait 10 %"). C'est trompeur.

Le rendement net, celui qui compte, déduit :

- La taxe foncière annuelle
- Les charges de copropriété si applicable
- La gestion locative (7 à 10 % des loyers)
- Les périodes de vacance locative (comptez 1 à 2 mois par an en réaliste)
- Les petites réparations courantes
- Les travaux lourds amortis (toiture, peinture extérieure, plomberie)

Dans la réalité UEMOA, un rendement brut affiché à 10 % devient souvent 5 à 6 % net. C'est encore correct, mais ça change la décision.

## Critère 3 — La liquidité à la revente

Un bien immobilier n'est pas liquide. Vous ne vendez pas en 48 heures comme une action BRVM.

Posez-vous la question : dans 10 ans, si je dois revendre rapidement (études des enfants à l'étranger, urgence familiale, retournement de carrière), **qui sera l'acheteur naturel de ce bien ?**

- Une villa haut de gamme à 150 millions FCFA dans un quartier excentré : acheteur rare, décote probable.
- Un appartement 2 chambres dans un quartier central à 35 millions FCFA : marché profond, revente rapide.

## Critère 4 — La cohérence avec votre patrimoine global

Dernier critère, le plus ignoré. Ce bien immobilier, dans votre patrimoine global, représente quoi ?

- 20 % → sain, vous diversifiez.
- 50 % → à surveiller, vous êtes exposé.
- 90 % → problème, tout votre patrimoine dépend d'un seul marché et d'un seul actif illiquide.

L'erreur classique : vendre toutes ses actions, vider son épargne, emprunter au max et mettre 100 % dans une maison. Résultat : en cas de coup dur, plus aucune marge de manœuvre.

## En résumé

Avant de signer un compromis de vente, prenez 48 heures. Validez l'emplacement (les 3 couches), recalculez le rendement net, interrogez-vous sur la liquidité à la revente, et mesurez la cohérence patrimoniale. Si les 4 critères sont verts, foncez. Si un seul est rouge, reprenez la négociation ou passez votre chemin.

---

*Nous préparons un ebook dédié à l'investissement immobilier locatif en UEMOA. Inscrivez-vous à la newsletter Hedjav pour être informé de sa sortie.*`,
    is_published: true,
    published_at: NOW,
  },

  {
    title: 'Entrepreneur UEMOA : comment se payer un salaire sans fragiliser sa trésorerie',
    slug: 'entrepreneur-uemoa-se-payer-salaire',
    category: 'Entrepreneuriat',
    cover_image_url: null,
    featured: false,
    excerpt:
      "L'une des questions les plus fréquentes en accompagnement : combien et comment se verser quand on est chef d'entreprise en zone UEMOA ? Une méthode simple en 4 étapes.",
    body: `Beaucoup d'entrepreneurs UEMOA oscillent entre deux extrêmes : se payer zéro pendant des années "parce que la boîte grandit", ou se servir de la caisse au quotidien sans règle claire. Les deux fragilisent l'entreprise et le patrimoine.

## Étape 1 — Poser le principe d'un salaire fixe mensuel

Même modeste, même quelques centaines de milliers de FCFA au démarrage, le salaire fixe a trois vertus :

- Il vous oblige à **structurer la trésorerie** de l'entreprise (charges prévisibles).
- Il vous donne une **base pour votre propre budget personnel** (crédit immobilier, cotisations retraite, etc.).
- Il sépare clairement **flux de l'entreprise** et **flux personnels** — condition de base d'une bonne gestion.

## Étape 2 — Le calibrer selon la trésorerie mini

Le montant du salaire doit être tel que, même dans un mois creux, l'entreprise puisse le payer **sans toucher à son fonds de roulement minimum** (FR mini).

Méthode pratique :
1. Listez vos charges fixes mensuelles moyennes de l'entreprise (loyer, salaires, télécoms, comptable, etc.).
2. Ajoutez une marge de sécurité de 20 %.
3. Votre salaire doit tenir dans la différence entre le chiffre d'affaires récurrent (le plus prévisible) et cette somme.

## Étape 3 — Distinguer salaire et dividendes

Un dirigeant de SARL ou SA peut être rémunéré de deux façons complémentaires :

- **Le salaire de gérance** : mensuel, régulier, soumis aux charges sociales.
- **Les dividendes** : annuels, versés sur les bénéfices après IS, fiscalement distincts.

Un montage classique en UEMOA : salaire modeste et régulier + dividende annuel en fonction des résultats. Cela stabilise votre revenu tout en laissant à l'entreprise la flexibilité de récompenser les bonnes années.

## Étape 4 — Ne pas oublier le patrimoine personnel

Se payer un salaire n'est pas seulement une question de train de vie. C'est aussi ce qui vous permet :

- De cotiser à votre retraite via les caisses nationales (CNSS au Bénin, etc.).
- De construire un patrimoine **en dehors** de votre entreprise (actions BRVM, immobilier perso, épargne).
- De ne pas être totalement dépendant d'un seul actif (votre société).

Beaucoup d'entrepreneurs découvrent à 50 ans qu'ils valent zéro "en dehors" de leur entreprise. C'est un risque patrimonial majeur.

## Trois pièges à éviter

1. **Confondre caisse de l'entreprise et porte-monnaie personnel**. Même si vous êtes seul associé, la séparation juridique doit se traduire dans les flux.
2. **Se payer trop tôt en phase de démarrage**, au point de mettre l'entreprise en risque cash.
3. **Se payer uniquement en dividendes** pour des raisons fiscales : aucune couverture sociale, aucune régularité.

---

*Notre futur ebook "Entrepreneur patrimonial : structurer ses revenus en zone UEMOA" traitera ces questions en profondeur. Restez informé via la newsletter Hedjav.*`,
    is_published: true,
    published_at: NOW,
  },

  {
    title: 'Finances personnelles : la méthode 50/30/20 adaptée à la zone UEMOA',
    slug: 'methode-50-30-20-adaptee-uemoa',
    category: 'Finance personnelle',
    cover_image_url: null,
    featured: false,
    excerpt:
      "La règle 50/30/20 est un classique des finances personnelles. Mais telle quelle, elle ne colle pas aux réalités de l'Afrique francophone. Voici la version adaptée que j'utilise avec mes clients.",
    body: `Issue du livre "All Your Worth" d'Elizabeth Warren, la règle 50/30/20 est devenue un standard en finances personnelles : 50 % des revenus aux besoins, 30 % aux envies, 20 % à l'épargne. Simple, mémorable. Mais dans le contexte UEMOA, elle demande quelques ajustements.

## Les 3 réalités UEMOA qui changent la donne

**1. Les obligations familiales étendues.**
Dans nos sociétés, le salaire d'un cadre ou entrepreneur soutient rarement une seule cellule familiale. Il y a les parents, les frères et sœurs, les neveux en études, les événements communautaires. Ignorer cette réalité rend tout budget irréaliste.

**2. La faible couverture sociale.**
Moins de retraite garantie, moins d'assurance maladie universelle, peu de chômage. L'épargne n'est pas un luxe, c'est un filet.

**3. Des opportunités d'investissement spécifiques.**
BRVM, immobilier locatif, tontines structurées, titres souverains UMOA : les supports existent mais demandent à être intégrés dans la répartition.

## La version adaptée : 45/25/20/10

Voici la répartition que je recommande à la majorité de mes clients cadres et entrepreneurs UEMOA.

### 45 % — Besoins vitaux
Logement, alimentation, transport, santé, éducation des enfants, télécoms. On serre un peu par rapport au 50 % classique pour libérer de la marge.

### 25 % — Train de vie personnel et familial
Loisirs, sorties, habillement, voyages. **Important** : cette ligne inclut les **obligations familiales régulières**. Mettre un montant mensuel dédié (par exemple 10 % du revenu) évite que ces charges n'explosent le reste du budget.

### 20 % — Épargne et investissement
C'est la ligne sacrée. À ventiler :
- 5 % en **épargne de précaution** liquide (compte bancaire rémunéré, tant que l'objectif de 6 mois de dépenses n'est pas atteint).
- 15 % en **investissement** (BRVM, obligations, immobilier, SICAV, selon votre profil).

### 10 % — Fonds événements et solidarité
Ligne spécifique UEMOA : mariages, funérailles, naissances, fêtes communautaires. Ces événements, parfois imprévisibles, peuvent déséquilibrer un budget si on n'a pas anticipé. En réservant 10 %, on les absorbe sereinement.

## Cas pratique : cadre à 1 500 000 FCFA/mois

| Poste | Répartition | Montant mensuel |
|---|---:|---:|
| Besoins vitaux | 45 % | 675 000 FCFA |
| Train de vie | 25 % | 375 000 FCFA |
| Épargne et investissement | 20 % | 300 000 FCFA |
| Fonds événements/solidarité | 10 % | 150 000 FCFA |
| **Total** | **100 %** | **1 500 000 FCFA** |

Sur 300 000 FCFA épargnés par mois, en 5 ans avec un rendement moyen raisonnable, vous construisez un patrimoine financier de l'ordre de 20 à 25 millions FCFA. Un vrai socle.

## Les 4 pièges à éviter

1. **Viser tout de suite 30 % d'épargne** : c'est irréaliste en début de carrière. Commencez à 10-15 %, montez progressivement.
2. **Ignorer la ligne événements** : elle n'est pas du gaspillage, elle **protège** votre budget principal.
3. **Confondre épargne et investissement** : l'épargne reste disponible, l'investissement se projette sur 5-10 ans.
4. **Ne pas automatiser les virements** : mettez en place un virement permanent dès la réception du salaire vers vos comptes d'épargne et d'investissement.

---

*Notre prochain ebook traitera en détail la construction d'un plan financier personnel en zone UEMOA. Inscrivez-vous à la newsletter Hedjav pour être prévenu en avant-première.*`,
    is_published: true,
    published_at: NOW,
  },
]

// Ajoute author + source + quality_score par défaut
const prepared = articles.map((a) => ({
  ...a,
  author: AUTHOR,
  source: 'manual',
  quality_score: null,
}))

const { error } = await supabase
  .from('articles')
  .upsert(prepared, { onConflict: 'slug' })
  .select('slug, title')

if (error) {
  console.error('Erreur upsert articles:', error)
  process.exit(1)
}

console.log(`${prepared.length} article(s) seedes avec succes.`)
for (const a of prepared) console.log(`  - ${a.slug} : ${a.title}`)
