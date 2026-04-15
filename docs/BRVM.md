# BRVM — Guide unifié Hedjav / EGP

> Ce fichier regroupe et remplace les anciens docs séparés :
> `BRVM_ADMIN.md`, `BRVM_DOWNLOADER.md`, `BRVM_MAINTENANCE.md`,
> `BRVM_PARSER_STRATEGY.md`, `BRVM_URL_PATTERNS.md`, `BRVM_FINAL_AUDIT.md`,
> `BRVM_PRODUCT_REDESIGN.md`.
>
> Historique complet des versions intermédiaires : `git log -- docs/BRVM_*.md`.

---

## 1. Vision produit

Le **Centre de Veille BRVM** (`/admin/brvm`) est un hub structuré autour de
**4 univers métiers fidèles à la logique BRVM / RichBourse** :

1. **Données de marché** — résumé séance, cours actions, cours obligations, indices
2. **Rapports sociétés cotées** — hiérarchie `société → type → documents`
3. **Annonces émetteurs** — 8 sous-catégories (AG, résolutions, notations, ESV, communiqués, dirigeants, franchissements, informations permanentes)
4. **Publications** — BOC, bulletins mensuels, stats trimestrielles, années boursières, avis, données économiques, valeurs liquidatives

Sources : `brvm.org` (priorité), `bfin.brvm.org`, `sikafinance.com`. Le système
stocke **les métadonnées** (titre, date, URL, checksum) par défaut. Les PDFs
sont téléchargés à la demande dans le bucket privé `brvm-documents`.

Priorité métier : **BOC important, non dominant**. Il redevient une sous-catégorie
parmi les 7 de Publications.

---

## 1bis. Logique produit 4 univers (refonte 2026-04-15)

Spec complète : `docs/superpowers/specs/2026-04-15-brvm-refonte-4-univers-design.md`.

### Navigation cible (sidebar à gauche)

```
CENTRE BRVM
├ Vue d'ensemble
├ Données de marché       (Résumé · Actions · Obligations · Indices)
├ Rapports cotées         (Liste sociétés → [slug] → Tout · Annuels · États fin · Semestriels · Trimestriels · Commentaires activité)
├ Annonces émetteurs      (Toutes · Convocations AG · Projets résolution · Notations · ESV · Communiqués · Changements dirigeants · Franchissements seuil · Informations permanentes)
├ Publications            (BOC · Bulletins mensuels · Stats trimestrielles · Années boursières · Avis · Données économiques · Valeurs liquidatives)
├ Maintenance             (diagnostic admin simple)
└ Alertes                 (digests email)
```

### Règles non négociables

- **Tri décroissant partout** — `order by doc_date desc nulls last, discovered_at desc` verrouillé dans `lib/brvm/documents.ts` et `lib/brvm/market.ts`.
- **Pas de BOC-centricité** — BOC = une sous-catégorie de Publications, pas un onglet.
- **Liens prod = `https://egp.hedjav.com`** partout, jamais localhost (helper `lib/url.ts`).
- **Pas d'onglets vides** — `EmptyState` éditorial si rien à afficher.
- **Badges sobres, pas d'artefacts** — `DocTypeBadge` stable (`display:inline-block`, `min-width`, `white-space:nowrap`).

### Logique de classement (6 axes + familles)

| Axe | Colonne | Source |
|---|---|---|
| Famille | `doc_family` | CHECK (market / report / announcement / publication) |
| Sous-type métier | `doc_subtype` | text libre, mappé via taxonomie fixe |
| Société | `emetteur_id → brvm_emetteurs` | FK normalisée |
| Secteur | `brvm_emetteurs.sector` via jointure | text |
| Indice | `brvm_emetteurs.indices[]` | text[] |
| Date | `doc_date`, `discovered_at`, `published_at` | timestamptz |
| Source URL | `source_url` | text |
| PDF URL | `pdf_url` + `metadata.storage_path` | text |

Voir § 2 pour le schéma DB complet.

### Alertes email (multi-fréquence)

- **daily / weekly / monthly** cumulables, cochées par défaut.
- Envoi séquentiel depuis `/admin/brvm/alertes`.
- Groupement email par famille, puis sous-type, puis date DESC.
- IA optionnelle (DeepSeek > OpenAI > Anthropic). Jamais bloquant.
- Journalisation `brvm_alert_log` (migration 025).

---

## 2. Schéma de données

| Table | Rôle | Migration |
|---|---|---|
| `brvm_data` | Données marché legacy (cours, indices, résumé séance) en JSON | 019 + filet 020 |
| `brvm_sources` | Sources hiérarchisées (brvm-org=10, bfin=20, sikafinance=30) | 020 / 023 |
| `brvm_documents` | Documents de veille, dédupliqués par `checksum` UNIQUE | 020 / 023 |
| `brvm_alert_log` | Historique des digests email admin | 025 |

### Colonnes clés `brvm_documents`

- `source_id` → jointure `brvm_sources`
- `doc_type` : `boc | rapport_annuel | rapport_trimestriel | rapport_semestriel | communique | annonce | note_information | avis | autre`
- `title`, `description`, `doc_date`, `published_at`, `discovered_at`
- `source_url` (page HTML où découvert), `pdf_url` (lien direct)
- `issuer_slug`, `issuer_name`
- `sector`, `market_index` (ajoutés par 025, nullable)
- `checksum` UNIQUE — SHA256 composite `source|pdf_url_or_source_url|title_normalisé`
- `is_new`, `is_processed`, `processed_at`, `processed_by`
- `metadata jsonb` — extensibilité (scoring IA, tags, storage_path du PDF archivé)

### Dédup par checksum

`computeChecksum()` dans `lib/brvm/checksum.ts` calcule
`sha256(source_slug | pdf_url_ou_source_url | title_normalisé)`. Re-scraper 1000×
la même URL = 1 ligne. Si une URL change (republish), nouveau checksum →
nouvelle ligne (correct). Indépendant du contenu binaire.

`computeFileChecksum(buffer)` fait un SHA256 du contenu — utilisé par le
downloader pour vérifier l'intégrité des fichiers archivés.

### Notifications auto

Trigger PG `notify_new_brvm_document` (migration 020/023) insère une ligne dans
`admin_notifications` à chaque INSERT. BOC = `priority='high'`, autres = `normal`.

---

## 3. Hub admin (`/admin/brvm`)

**Page unique** qui absorbe l'ancien « Veille BRVM » et l'ancien « Downloader » :

1. **KPIs** : Nouveaux BOC (today) · Nouveautés 7 jours · Total indexés · À traiter.
2. **État sources** : brvm-org / bfin / sikafinance avec pastille OK/KO + dernière tentative.
3. **Hub central** (`BrvmHubPanel.tsx`) :
   - Filtre **période** (today / 7d / 30d / mois / custom / tout)
   - Filtre **multi-types** (BOC, rapports, communiqués, avis, annonces, notes, autre)
   - Filtre **source** + **statut** (nouveautés / non traités / tous)
   - **Tri** configurable (découverte DESC / date doc DESC / type puis date) — toujours décroissant
   - **Recherche** texte libre (titre, description, émetteur)
   - Bouton **« Archiver PDFs de la sélection »** → télécharge tous les PDFs de la période en un clic
   - Actions par ligne : Source ↗ · PDF ↗ · Traiter

Sous-navigation :
- `/admin/brvm` — Veille & archivage (le hub)
- `/admin/brvm/alertes` — Alertes email (daily / weekly / monthly)
- `/admin/brvm/maintenance` — Health check et diagnostics

---

## 4. Routes API

| Route | Méthode | Auth | Rôle |
|---|---|---|---|
| `/api/brvm/scrape` | POST | Bearer `INTERNAL_API_TOKEN` | Orchestrateur : market + BOC + rapports + annonces |
| `/api/brvm/scrape/async` | POST | Bearer | Mode 202 Accepted non-bloquant (cron externe) |
| `/api/brvm/scrape/boc` | POST | Bearer | BOC uniquement (priorité métier) |
| `/api/brvm/scrape/rapports` | POST | Bearer | Rapports société cotée |
| `/api/brvm/scrape/annonces` | POST | Bearer | Toutes catégories annonces |
| `/api/brvm/documents` | GET | Session admin | Liste paginée + filtres (période, multi-types, source, tri, recherche) |
| `/api/brvm/documents/[id]/process` | POST | Session admin | Marquer traité |
| `/api/brvm/download` | POST | Session admin OU Bearer | Archiver PDFs par période dans Storage privé |
| `/api/brvm/download` | GET `?document_id=` | Session admin | Signed URL 5 min vers un PDF archivé |
| `/api/brvm/alerts/digest` | POST | Session admin OU Bearer | Digest email admin (daily/weekly/monthly) avec IA optionnelle |
| `/api/brvm/summarize` | POST | Bearer | Résumé IA legacy (brvm_data) |
| `/api/brvm/weekly-digest` | POST | Bearer | Synthèse hebdo legacy → brouillon article |
| `/api/brvm/maintenance` | GET | Session admin OU Bearer | Rapport de santé complet |
| `/api/admin/brvm-trigger` | POST | Session admin | Proxy vers `/api/brvm/scrape` |

### Routes supprimées (legacy)

| Ancienne | Remplacée par |
|---|---|
| `/api/brvm/daily` | `/api/brvm/scrape` |
| `/api/brvm/reports-scan` | `/api/brvm/scrape/rapports` |
| `/admin/brvm/downloader` (page) | redirection vers `/admin/brvm` |

---

## 5. Téléchargeur PDF (intégré au hub)

**Principe** — `brvm_documents` ne stocke que les métadonnées. Le téléchargeur
va chercher les PDFs matchés, les upload dans le bucket privé Supabase Storage
`brvm-documents`, puis stocke le chemin dans `brvm_documents.metadata.storage_path`.

**Idempotent** — relancer le même run = PDFs déjà archivés = `skipped_already_archived`.
**Résilient** — un 404 ou un timeout n'arrête pas le run.

### Storage

| Objet | Emplacement | Accès |
|---|---|---|
| PDF binaire | bucket `brvm-documents` (privé) | Signed URL 5 min via `GET /api/brvm/download?document_id=XXX` |
| Chemin | `brvm_documents.metadata.storage_path` | via `/api/brvm/documents` |

Nom canonique : `{doc_type}/{YYYY}/{YYYY-MM-DD}_{checksum8}.pdf`
Ex : `boc/2026/2026-04-10_a3f9c2b1.pdf`

### Statuts item

| Status | Signification |
|---|---|
| `downloaded` | PDF téléchargé et archivé |
| `skipped_already_archived` | Déjà archivé, rien à faire |
| `skipped_no_pdf_url` | Document sans `pdf_url` indexé |
| `missing` | URL 404 côté BRVM |
| `error` | Erreur réseau, timeout ou upload |

### Usage CLI (fallback ou backfill massif)

```bash
# Tous les BOC de janvier 2026
npx tsx scripts/download-brvm-pdfs.ts --from=2026-01-01 --to=2026-01-31 --types=boc

# Rapports annuels 2025
npx tsx scripts/download-brvm-pdfs.ts --from=2025-01-01 --to=2025-12-31 --types=rapport_annuel --limit=100

# Dry-run
npx tsx scripts/download-brvm-pdfs.ts --from=2026-01-01 --to=2026-04-10 --dry-run
```

### Contraintes respectées

- Priorité sources : `brvm-org > bfin > sikafinance` (l'ordre n'est pas négociable)
- Rate limiting : 200 ms entre items (poli envers brvm.org)
- Pas de PDF en base (bytea interdit) — Storage privé uniquement
- Checksum binaire stocké dans `metadata.file_checksum`

---

## 6. Alertes email admin (digest)

**Route** `POST /api/brvm/alerts/digest`
**Auth** : bearer `INTERNAL_API_TOKEN` (cron externe) ou session admin.
**Body** : `{ frequency, dry_run?, ai? }`

| frequency | Période | Trigger suggéré |
|---|---|---|
| `daily` | Aujourd'hui | cron quotidien 19h UTC |
| `weekly` | 7 derniers jours | cron vendredi 18h UTC |
| `monthly` | 30 derniers jours | cron le 1er du mois 09h UTC |
| `manual` | Aujourd'hui | déclenché depuis `/admin/brvm/alertes` |

Structure email :
- Badge fréquence + préheader de période
- Analyse IA optionnelle (DeepSeek priorisé, sinon OpenAI, sinon Anthropic, sinon skip)
- Groupes par catégorie, BOC en premier, tri DESC par date par groupe
- Liens directs vers PDF + source pour chaque document
- Bouton « Ouvrir le Centre de Veille BRVM »

Historique consultable dans `/admin/brvm/alertes` (table `brvm_alert_log`).

**Pas de publication client pour l'instant.** Ces alertes sont strictement
réservées aux administrateurs. Le tunnel commercial (abonnement stratégique,
version client) sera branché plus tard avec son propre flow.

---

## 7. Import historique

Le miroir HTTrack `hedjav-scrap/` (jamais committé, **236 MB**, dans `.gitignore`)
contient l'historique brvm.org.

```bash
# Dry run (aucun insert, affiche ce qui serait fait)
npx tsx scripts/import-brvm-history.ts --dry-run

# Import réel
npx tsx scripts/import-brvm-history.ts
```

Le script lit `hedjav-scrap/hedjav-scrap/www.brvm.org/`, classifie chaque PDF
(BOC / rapport / annonce…), extrait la date depuis le nom de fichier, calcule
le checksum, insère via `upsertDocument()`. Idempotent. **À ne jamais lancer
en production** (lit des fichiers locaux).

---

## 8. Stratégie de parsing

### Principes directeurs

1. **Résilience > élégance**. Le HTML Drupal de brvm.org évolue sans préavis.
   Préférer les sélecteurs basés sur les URLs des liens plutôt que sur la
   structure DOM :

   ```ts
   // ✅ robuste
   $('a[href*="boc_"][href$=".pdf"]')
   // ❌ fragile
   $('.view-content > .views-row > .views-field-title > span > a')
   ```

2. **Miroir HTTrack = oracle hors-ligne**. Valider chaque nouveau sélecteur sur
   les 219 PDFs du miroir avant de déployer.

3. **Priorité sources = priorité métier**. Essayer `brvm.org` en premier,
   fallback `bfin`, puis `sikafinance`. S'arrêter au premier succès.

4. **Dédup = checksum composite**. Indépendant du binaire. Permet de dédupliquer
   sans télécharger.

### Helpers partagés (`lib/brvm/scrapers/brvm-org.ts`)

| Helper | Rôle |
|---|---|
| `fetchHtml(url)` | GET + User-Agent + timeout + null si erreur |
| `absUrl(href)` | Relatif → absolu |
| `cleanText(text)` | Collapse whitespace + trim |
| `extractBocDate(filename)` | `boc_YYYYMMDD_N.pdf` → `YYYY-MM-DD` |
| `extractReportDate(filename)` | `YYYYMMDD_-_fs_-_…` → `YYYY-MM-DD` |
| `extractIssuerSlug(filename)` | Extrait slug (`air_liquide_ci` → `air-liquide-ci`) |
| `parseDateText(text)` | Parse ISO / FR (`10/04/2026`) / littéral (`10 avril 2026`) |

### Checklist avant de modifier un scraper

- [ ] Lu `§ 9 Patterns d'URL` ci-dessous
- [ ] Pattern robuste (URL, pas DOM profond)
- [ ] Testé sur miroir : `npx tsx scripts/import-brvm-history.ts --dry-run`
- [ ] `npx tsc --noEmit` passe
- [ ] Testé live via `POST /api/brvm/scrape/{type}` avec Bearer
- [ ] Dédup checksum vérifiée (re-lancer 2× → 0 doublon)

### Fallback inter-sources

```ts
async function scrapeBocMultiSource() {
  const fromBrvm = await scrapeBocListing(3)
  if (fromBrvm.length > 0) return fromBrvm
  const fromBfin = await scrapeBfinBocDirect(startDate, endDate)
  if (fromBfin.length > 0) return fromBfin
  return []
}
```

Règle : **ne pas multiplier les tentatives inutiles**. Si brvm.org marche à 90 %,
on s'arrête au premier succès.

---

## 9. Catalogue des patterns d'URL BRVM

**Source de vérité** pour scraper + downloader. Observations tirées de 219 PDFs
du miroir HTTrack.

### 9.1 Pages de listing (scraping entry points)

| Section | URL HTML |
|---|---|
| BOC quotidien | `www.brvm.org/fr/bulletins-officiels-de-la-cote.html` |
| Bulletins mensuels | `www.brvm.org/fr/bulletins-mensuels.html` (`?page=N`) |
| Avis & Publications | `www.brvm.org/fr/marche/avis-et-publications/publications.html` |
| Communiqués émetteurs | `www.brvm.org/fr/emetteurs/type-annonces/communiques.html` |
| Franchissements de seuil | `www.brvm.org/fr/emetteurs/type-annonces/franchissements-de-seuil.html` |
| Changements de dirigeants | `www.brvm.org/fr/emetteurs/type-annonces/changements-de-dirigeants.html` |
| Assemblées générales | `www.brvm.org/fr/emetteurs/type-annonces/assemblees-generales.html` |
| Notes d'information | `www.brvm.org/fr/emetteurs/type-annonces/notes-information.html` |
| Rapports société cotée | `www.brvm.org/fr/rapports-societe-cotes/{emetteur}.html` |
| Sociétés cotées | `www.brvm.org/fr/emetteurs/societes-cotees` |

### 9.2 Patterns de PDF

Tous servis depuis `/sites/default/files/`.

**BOC** : `boc_YYYYMMDD.pdf` ou `boc_YYYYMMDD_N.pdf` (Drupal ajoute `_2` lors
des remplacements — la quasi-totalité des BOC observés ont ce suffixe).

**États financiers** : `YYYYMMDD_-_fs_-_{emetteur}_-_exercice_YYYY.pdf`.

**Communiqués / annonces** : `YYYYMMDD_-_{categorie}_-_{emetteur}_{NUM}?.pdf`.

Préfixes → DocType :

| Préfixe | DocType |
|---|---|
| `fs_-_` | `rapport_*` (selon exercice) |
| `communique_` | `communique` |
| `communique_amf` | `note_information` |
| `communique_declaration_franchissement_seuils_` | `annonce` |
| `declarations_de_franchissement_de_seuils_` | `annonce` |
| `changement_important_dans_la_direction_` | `annonce` |
| `avis_ndeg` | `avis` |
| `avis_de_convocation_` | `annonce` |
| `notation_financiere_` | `autre` |
| `ordre_du_jour_` / `pouvoir_` / `projet_de_resolutions_` | `annonce` |
| `calendrier_de_paiement_des_dividendes_` | `annonce` |
| `bilan_semestriel_du_contrat_de_liquidite_` | `rapport_semestriel` |

### 9.3 Slugs émetteur

Convention `{nom-court}_{pays_iso2}` snake_case. Codes pays observés :
`ci`, `sn` / `senegal`, `bf` / `burkina_faso`, `tg`, `ng`, `ml` / `mali`,
`benin`.

⚠️ Conversion URL ↔ filename : l'URL HTML utilise `-` (`air-liquide-ci.html`)
alors que le PDF utilise `_` (`air_liquide_ci`).

### 9.4 Tips parser

1. Détection date : `\b\d{4}\d{2}\d{2}\b` dans le nom de fichier.
2. Détection type : dictionnaire préfixe → DocType, fallback `'autre'`.
3. Extraction slug : regex `_fs_-_([a-z0-9_]+?)_-_(exercice|rapport|arr|etats|comptes)`.
4. Versions `_1`, `_2`, `_N` : garder la plus récente pour la veille.
5. Pagination : `li.pager__item--next a` ou itérer `?page=0..N`.

### 9.5 Robots.txt observé

Interdits : `/includes/`, `/admin/`, `/search/`, `/user/login/`. Le scraper les évite.

---

## 10. Maintenance et health check

### Points d'entrée

| Voie | Usage | Sortie |
|---|---|---|
| `GET /api/brvm/maintenance` | Monitoring externe + UI admin | JSON `MaintenanceReport` |
| `npx tsx scripts/brvm-health-check.ts` | Local / CI | Texte + exit code |
| `npx tsx scripts/brvm-maintenance-report.ts` | Archive Markdown | Fichier `.brvm-reports/*.md` |

Tous partagent `lib/brvm/maintenance.ts`.

### Ce qui est vérifié

1. **Tables** : `brvm_sources` et `brvm_documents` présentes (erreurs 42P01 / PGRST205 signalées).
2. **Sources** : les 3 slugs seedés, dernier `last_success_at` récent.
3. **Documents** : total, par type, par source, nouveautés 24 h / 7 j, backlog, PDFs archivés vs pas.
4. **Fraîcheur** : au moins 1 doc découvert les 7 derniers jours, BOC présents, backlog < 50.

### Statut agrégé + exit code CLI

| Status | Signification | Exit |
|---|---|---|
| `ok` | Tout vert | 0 |
| `warning` | ≥ 1 warning | 1 |
| `critical` | ≥ 1 critical | 2 |
| `unknown` | Erreur de check | 3 |

### Cadence recommandée

| Fréquence | Outil | Objectif |
|---|---|---|
| Toutes les 30 min | `GET /api/brvm/maintenance` via cron-job.org | Monitoring externe |
| Quotidienne | `brvm-health-check.ts --quiet` via cron VPS | Log système |
| Hebdo | `brvm-maintenance-report.ts` | Rapport archivable |
| Ponctuelle | `brvm-health-check.ts` | Après modif scraper |

### Checks (IDs stables)

| ID | Warning si | Critical si |
|---|---|---|
| `table_brvm_sources` | — | Table absente |
| `table_brvm_documents` | — | Table absente |
| `source_seed_{slug}` | — | Slug manquant |
| `source_fresh_{slug}` | > 48 h ou jamais | > 7 j ou aucun succès |
| `docs_total` | 0 document | — |
| `docs_boc` | 0 BOC | — |
| `docs_fresh` | Aucun 7 j | — |
| `docs_unprocessed` | Backlog > 50 | — |

---

## 11. Crons recommandés

À configurer sur cron-job.org (ou cron VPS) :

| Tâche | Fréquence | Endpoint |
|---|---|---|
| Scrape orchestrateur | chaque jour 18 h UTC | `/api/brvm/scrape/async` |
| Digest admin journalier | chaque jour 19 h UTC | `/api/brvm/alerts/digest` body `{"frequency":"daily"}` |
| Digest admin hebdomadaire | vendredi 18 h UTC | `/api/brvm/alerts/digest` body `{"frequency":"weekly"}` |
| Digest admin mensuel | le 1er du mois 09 h UTC | `/api/brvm/alerts/digest` body `{"frequency":"monthly"}` |
| Résumé IA legacy | 20 h UTC (désactivé tant que `brvm_data` n'est plus alimenté) | `/api/brvm/summarize` |
| Maintenance externe | toutes les 30 min | `GET /api/brvm/maintenance` avec Bearer |

Auth : header `Authorization: Bearer $INTERNAL_API_TOKEN`.

---

## 12. Troubleshooting

### « Could not find the table 'public.brvm_data' »

Migration 019 jamais appliquée. Soit appliquer 019 puis 020, soit appliquer
uniquement 020 (contient un filet `CREATE TABLE IF NOT EXISTS`).

### « Source brvm-org introuvable »

Migration 020/023 non appliquée, ou seed raté. Vérifier :

```sql
SELECT slug, name, priority FROM brvm_sources;
```

Doit retourner 3 lignes.

### « Lancer la veille » ne retourne rien

brvm.org est régulièrement down. Logs :

```bash
pm2 logs hedjav-web | grep brvm
```

### Documents sans date

Normal pour certains types. Si persistant, ajouter un pattern dans
`parseDateText()` de `lib/brvm/scrapers/brvm-org.ts`.

### `overall_status: critical` avec `table_brvm_sources: critical`

Appliquer `supabase/migrations/023_brvm_clean_reset.sql`.

### `source_fresh_brvm-org: critical` isolé

brvm.org a refusé les connexions ou changé son HTML. Procédure :

1. `curl -sL https://www.brvm.org/fr/bulletins-officiels-de-la-cote.html | head -50`
2. Si HTML répond mais sélecteur cassé : adapter `lib/brvm/scrapers/brvm-org.ts`.
3. Re-tester sur le miroir avant de déployer.

### Trop de `docs_unprocessed`

Backlog. Aller `/admin/brvm`, filtre « Non traités », cliquer « Traiter » sur
les pertinents.

### `GET /api/brvm/download?document_id=X` retourne 404

Doc indexé mais pas archivé. Lancer un downloader par période depuis le hub
`/admin/brvm` (bouton « Archiver PDFs de la sélection »).

### Tous les items en `error` lors d'un archivage

Probable : clé service-role invalide, ou bucket absent. Vérifier :

```sql
SELECT * FROM storage.buckets WHERE id = 'brvm-documents';
```

---

## 13. Sécurité et conventions

- `/hedjav-scrap/` (ou `/hedjav-scrapp/`) dans `.gitignore`. Vérifier avant
  chaque commit : `git check-ignore -v hedjav-scrap/`.
- Routes `/api/brvm/scrape*` exigent `Bearer INTERNAL_API_TOKEN`. Jamais logger
  ce token.
- Routes admin (`/documents`, `/process`, `/alerts/digest`) vérifient
  `profile.role='admin'` côté serveur.
- RLS `admin only` sur `brvm_documents`, `brvm_sources`, `brvm_alert_log`.
  Service-role bypass pour les scrapers.
- Aucune clé IA en dur. Toujours via `process.env` (voir `lib/ai/client.ts`).

---

## 14. Historique des PRs clés

- #52 — Export BRVM + recherche UI.
- #53 — Scraper sikafinance.
- #54 — Refonte dashboard admin.
- #55 — Livraison ebook FedaPay.
- #56 — Refonte veille (sources + documents + dédup checksum).
- #57 — Reset clean tables.
- #58 — Downloader PDF par période + maintenance.
- #59 — Messages d'erreur friendly.
- #60 → #67 — Stabilisation scraping (undici Agent SSL, async cron, etc.).
- `feature/brvm-hub-veille-ia` — **Fusion Veille + Downloader** en Centre de
  Veille, alertes email multi-fréquence, provider DeepSeek, consolidation docs.

Consulter `git log -- app/(admin)/admin/brvm` pour le détail.
