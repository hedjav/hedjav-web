# Centre de Veille BRVM — refonte produit

> Branche : `feature/iceberg-audit-fixes`. Avril 2026.
> Complète `docs/BRVM.md` (guide technique). Ce doc-ci traite du **pourquoi** produit.

---

## 1. Leaders étudiés

Analyse qualitative des logiques de navigation et segmentation observées sur :

- **RichBourse** (richbourse.com) — agrégateur BRVM référent, interface Bloomberg-like.
- **SikaFinance** (sikafinance.com) — portail info BRVM + UEMOA, logique éditoriale.
- **BRVM officielle** (brvm.org) — source primaire, classification par émetteur.

### Ce qu'on a repris

| Leader | Concept repris | Adapté comment |
|---|---|---|
| RichBourse | Navigation « par société cotée » en premier niveau | Onglet « Par société » avec regroupement accordéon |
| RichBourse | Segmentation par indice (Composite / BRVM 30 / Prestige) | Onglet « Par indice » |
| SikaFinance | Vue éditoriale chronologique des nouveautés en 1er plan | Onglet par défaut « Toutes les nouveautés » |
| SikaFinance | Filtres catégorie documentaire (rapports, communiqués, annonces…) | Pill multi-select côté filtres |
| BRVM officielle | Séparation par secteur d'activité | Onglet « Par secteur » |
| BRVM officielle | Logique d'archive annuelle | Onglet « Archives » avec cards par année |

### Ce qu'on n'a pas copié

- **Cours temps réel** : pas la mission d'un centre de veille documentaire, déjà
  géré par `brvm_data` (legacy) pour les synthèses.
- **Graphiques boursiers** : pas pertinent ici. Réservé à une future page
  `/admin/brvm/marche` ou à un widget pro public.
- **Densité d'infos tabulaire** type Bloomberg : on reste sobre,
  orienté lecture admin + décision (traiter, archiver, alerter).

---

## 2. Logique produit retenue

Principe : **chaque écran doit répondre à une question admin concrète.**

| Onglet | Question posée | Vue retournée |
|---|---|---|
| Toutes les nouveautés | "Qu'est-ce qui est arrivé récemment ?" | Flux chronologique DESC, filtres activés |
| Par société | "Qu'est-ce qui concerne Sonatel / BOA / Vivo ?" | Groupes émetteur triés par volume, accordéon |
| Par secteur | "Qu'est-ce qui bouge dans la banque / l'agro / les télécom ?" | Groupes par `metadata.sector` ou `brvm_documents.sector` |
| Par indice | "Qu'est-ce que publient les valeurs du BRVM 30 ?" | Groupes par `metadata.market_index` ou `brvm_documents.market_index` |
| Archives | "Que possède-t-on en stock sur 2024 / 2025 / 2026 ?" | Cards par année avec répartition par type |

Règles non négociables :
- **Tri décroissant partout.** Plus récent en tête.
- **BOC n'est plus un onglet autonome.** C'est une catégorie parmi d'autres.
- **Priorité BOC reste métier.** La pill « BOC » utilise la couleur or Hedjav
  pour attirer l'œil même quand elle est désactivée.
- **Actions à une ligne** : Source ↗ · PDF ↗ · Traiter. Pas de menu caché.
- **Archivage groupé inline**, pas de sous-page séparée (fusion PR #69 conservée).

---

## 3. Nouvelle structure du Centre BRVM

### Header (inchangé)
- Titre : Centre de Veille BRVM
- 4 KPIs : BOC aujourd'hui, nouveautés 7j, total indexé, à traiter
- Statut des sources (brvm-org / bfin / sikafinance)

### Filtres (enrichis)
- Période : today / 7d / 30d / this_month / custom / all
- **Catégorie documentaire** (pill multi-select) : BOC, rapports (annuel,
  semestriel, trimestriel), communiqué, avis, annonce, note d'information, autre
- Source : brvm-org / bfin / sikafinance
- Statut : tous / nouveautés / non traités
- Tri : découverte / date publication / type puis date
- Recherche : titre, émetteur, description

### Navigation principale (5 onglets)
1. Toutes les nouveautés — table plate
2. Par société — regroupement par `issuer_name || issuer_slug`
3. Par secteur — regroupement par `sector` (colonne ajoutée en 025)
4. Par indice — regroupement par `market_index` (colonne ajoutée en 025)
5. Archives — résumé par année avec répartition par type

### Bouton global
« ⇣ Archiver PDFs de la sélection » — toujours disponible, agit sur le
filtre courant.

---

## 4. Logique de classement (taxonomie)

La taxonomie exploitable en V1 :

| Axe | Colonne DB | Exemple |
|---|---|---|
| Source | `brvm_sources.slug` | `brvm-org` |
| Émetteur | `brvm_documents.issuer_slug` / `issuer_name` | `sonatel` / Sonatel |
| Secteur | `brvm_documents.sector` (025) | Télécommunications |
| Indice | `brvm_documents.market_index` (025) | BRVM Composite |
| Catégorie | `brvm_documents.doc_type` CHECK | `rapport_annuel` |
| Statut | `is_new`, `is_processed` | booléen |
| Nouveauté | `is_new` | booléen (reset par trigger) |
| Archivage | `metadata.storage_path` | chemin Storage si archivé |

Les colonnes `sector` et `market_index` sont nullable en V1. Elles se peupleront
progressivement :
1. Soit manuellement via un `/admin/brvm/taxonomy` (hors scope).
2. Soit via un prompt IA de classement exécuté au scraping (roadmap IA).
3. Soit via une table de référence `brvm_issuers` (issuer_slug → sector, index)
   jointe au moment de l'INSERT du document (à prévoir en Phase 2).

---

## 5. Logique d'alertes email

Voir aussi `docs/BRVM.md` § 6. Point produit spécifique :

- **Multi-fréquence** : daily, weekly, monthly — toutes cochées par défaut.
- **Cumulable** : Hermann reçoit les 3 s'il les laisse toutes actives.
- **Persistance** : le choix est stocké dans `admin_settings.brvm_alert_frequencies`
  (migration 026). Un admin peut désactiver `daily` et garder `weekly/monthly`.
- **Envoi séquentiel** depuis `/admin/brvm/alertes` : 1 clic → N digests selon
  les cases cochées.
- **Groupement email** : BOC en tête, puis rapports, puis communiqués, puis le
  reste. Tri DESC à l'intérieur de chaque groupe.
- **IA optionnelle** : note de synthèse DeepSeek/OpenAI/Anthropic. Jamais bloquant.
- **Journalisation** : chaque envoi crée une ligne dans `brvm_alert_log`
  (migration 025) pour audit / dédup cron.

---

## 6. Fix UI badge artifact

**Symptôme observé** : au refresh, le badge « Type » affichait parfois un rond
ou un artefact visuel avant hydration puis se stabilisait.

**Cause** : le rendu SSR d'un `<span>` avec padding + borderRadius + sans
`display: inline-block` + pas de `min-width` créait une hauteur 0 → flash visuel
pendant le layout.

**Correctif** : composant `DocTypeBadge` avec :
- `display: inline-block` (évite le collapse avant hydration)
- `min-width: 52` (largeur minimale stable)
- `white-space: nowrap` (pas de wrap du label court)
- `line-height: 1.4` (hauteur stable)
- Theme centralisé (`typeTheme(docType)`) — plus de duplication de styles.

---

## 7. Points à affiner plus tard

- **Peupler `sector` et `market_index`** sur les documents existants. V1 :
  les colonnes existent mais restent NULL jusqu'à enrichissement.
- **Taxonomie société référentielle** : créer `brvm_issuers` avec mapping
  issuer_slug → nom officiel, secteur, indice, actif/radié. Permet de joindre
  automatiquement lors du scraping.
- **Analyse IA par document** : scoring pertinence (0-100) + résumé 200 mots
  injecté dans `brvm_documents.metadata.ai_*`. Utile pour les digests.
- **Export CSV filtré** depuis le Centre BRVM.
- **Vue publique client** (Phase 3 commerciale) — aujourd'hui tout est admin-only.
