# BRVM — Audit final (avant mega fix maintenance/downloader)

État du système BRVM après les 3 PRs mergées (#55 livraison ebook, #56 refonte veille, #57 reset clean tables).
Document de référence pour cibler le travail restant.

## ✅ Ce qui est en place

### Base de données
- `brvm_data` (migration 019, filet 020/023) — données marché legacy (cours, indices, résumé séance), conservée pour compat
- `brvm_sources` (migration 023) — 3 sources seedées : `brvm-org` (priority=10) > `bfin` (20) > `sikafinance` (30), colonnes `last_scraped_at`, `last_success_at`, `last_error`
- `brvm_documents` (migration 023) — documents avec `checksum` UNIQUE (SHA256 composite), `doc_type` contraint, `is_new`, `is_processed`, `metadata jsonb`, indexes ciblés
- Trigger PG `notify_new_brvm_document` qui insère dans `admin_notifications` avec `priority='high'` pour BOC
- RLS admin-only sur les deux tables, service-role bypass pour les crons

### Code (lib/brvm/)
- `types.ts` — `DocType` union, `DOC_TYPE_LABELS`, `BrvmDocument`, `DocumentInput`, `ScrapeResult`
- `checksum.ts` — `computeChecksum`, `normalizeTitle`, `computeFileChecksum`
- `sources.ts` — `getAllSources`, `getSourceBySlug`, `getSourceBySlugDetailed` (distingue table_missing/not_seeded/unknown), `markSourceScraped`
- `documents.ts` — `upsertDocument` (dédup par checksum), `markProcessed`, `listDocuments`, `getDocumentStats`, `DocumentListFilters`
- `auth.ts` — `checkInternalToken` + `checkAdminSession`
- `scrapers/brvm-org.ts` — `scrapeBocListing`, `scrapeRapportsIndex`, `scrapeAllAnnonces`, helpers de parsing date
- `scraper.ts` (legacy) — `scrapeCoursActions`, `scrapeIndices`, `scrapeResumeSeance` (sikafinance), encore utilisé par `/api/brvm/scrape` pour le market data
- `article-generator.ts` (legacy) — résumé Claude, branché sur `/api/brvm/summarize`

### Routes API
| Route | Auth | Statut |
|---|---|---|
| `POST /api/brvm/scrape` | Bearer | Orchestrateur (market + BOC + rapports + annonces) |
| `POST /api/brvm/scrape/boc` | Bearer | OK, dédié |
| `POST /api/brvm/scrape/rapports` | Bearer | OK, dédié |
| `POST /api/brvm/scrape/annonces` | Bearer | OK, dédié |
| `GET /api/brvm/documents` | Session admin | Liste paginée avec filtres |
| `POST /api/brvm/documents/[id]/process` | Session admin | Marquer traité |
| `POST /api/brvm/summarize` | Bearer | Résumé IA legacy (utilise Claude) |
| `POST /api/brvm/weekly-digest` | Bearer | Digest hebdo legacy |
| `POST /api/brvm/export` | Bearer ou session admin | Lit `brvm_data` (legacy, peu utilisé) |
| `POST /api/admin/brvm-trigger` | Session admin | Proxy vers `/api/brvm/scrape` |

### Admin UI
- `/admin/brvm/page.tsx` — KPIs (BOC today/7d, total, à traiter), bandeau état sources, tabs (Tous/Nouveautés/BOC/Rapports/Annonces/Communiqués), DataTable + bouton "Lancer la veille"
- `/admin/brvm/BRVMTriggerButton.tsx` — bouton qui appelle `/api/admin/brvm-trigger`, affiche hint en cas d'erreur
- `/admin/brvm/BrvmDocumentsPanel.tsx` — tabs + DataTable client-side

### Scripts
- `scripts/import-brvm-history.ts` — lit `hedjav-scrap/`, classifie chaque PDF, insère via `upsertDocument()` (idempotent, `--dry-run`)

### Docs
- `docs/BRVM_ADMIN.md` — guide opérationnel (schéma, routes, admin, troubleshooting)
- `docs/CRON_SETUP.md` — crons recommandés
- `docs/DEPLOY.md` — étapes migration
- `CLAUDE.md` — section BRVM

### Sécurité Git
- `/hedjav-scrap/` ignoré (236 MB jamais committé)
- Vérifiable via `git check-ignore -v hedjav-scrap/`

## 🟡 Ce qui est partiel ou fragile

1. **`/api/brvm/export`** lit toujours `brvm_data` (table legacy). N'est plus appelé depuis l'admin UI mais reste réachable via POST direct. Devrait être migré vers `brvm_documents` ou supprimé.

2. **`/api/brvm/summarize` et `/weekly-digest`** dépendent de `brvm_data` (cours/indices) ET de la clé Claude. Le user a indiqué "pas de publication IA auto" — ces routes restent codées mais ne devraient pas être branchées sur un cron tant que l'API IA n'est pas dispo.

3. **Pas de stockage de PDFs téléchargés** — `brvm_documents` stocke les `pdf_url` (lien externe) mais pas les fichiers réels. Aucun mécanisme actuel pour télécharger massivement par période.

4. **Pas de health check / monitoring** des sources ou des routes. Si brvm.org tombe pendant 3 jours, on ne le sait que par sérendipité en regardant le bandeau sources.

5. **Pas de rapport de maintenance** — aucun moyen automatisé de produire un état de santé global.

6. **Le scraper `lib/brvm/scrapers/brvm-org.ts`** utilise des sélecteurs Drupal génériques (`$('a[href*="boc_"]')`, `$('.views-row, table tbody tr, article')`). Ces patterns marchent en V1 mais devraient être documentés avec exemples concrets pour faciliter les corrections futures.

7. **`scrapeRapportsIndex`** est trop optimiste — il scrape uniquement la page index `/fr/emetteurs/societes-cotees` qui n'expose pas tous les rapports. Il faudrait crawler chaque page émetteur. Aujourd'hui ça retourne 0-5 rapports max.

## ❌ Ce qui est cassé ou manquant

1. **PDF downloader par période** — feature explicitement demandée, n'existe pas du tout
2. **Maintenance / health check** — n'existe pas
3. **Pas de tracking de quels PDFs ont été téléchargés vs juste référencés** — impossible de savoir si un BOC est juste indexé (URL) ou archivé (fichier en local)
4. **Pas de rapport d'anomalies** — sources jamais scrapées, doublons checksum suspects, gaps dans les BOC, etc.
5. **Pas de docs sur la stratégie de parsing** — quelqu'un qui reprend le projet doit deviner pourquoi tel sélecteur Drupal a été choisi
6. **Pas de docs sur les patterns d'URL BRVM** — les conventions Drupal (`_2.pdf`, `?page=N` encodé en hash HTTrack, etc.) ne sont nulle part
7. **Admin BRVM mono-page** — tout est sur `/admin/brvm`. Pas de vue dédiée downloader, pas de vue maintenance, pas de drill-down par doc

## 🔧 Ce qui doit être unifié

1. Les routes BRVM sont dispersées entre `/scrape`, `/scrape/{boc,rapports,annonces}`, `/documents`, `/documents/[id]/process`, `/export`, `/summarize`, `/weekly-digest`. Une refonte légère par groupes (`scrape/`, `documents/`, `download/`, `maintenance/`) clarifierait la navigation API.

2. Les `getSourceBySlug` (legacy) et `getSourceBySlugDetailed` (nouveau) coexistent. À terme, n'utiliser que la version Detailed et supprimer l'ancienne.

3. Le `BRVMTriggerButton` affiche un hint mais l'admin V1 n'a pas de drill-down sur l'erreur réelle. Une vue maintenance dédiée résoudrait ça.

## 🗑️ Ce qui doit être supprimé (à terme, pas dans cette PR)

1. **`/api/brvm/export`** si on confirme qu'aucun cron ne l'appelle — il dépend de `brvm_data` legacy.
2. **`getSourceBySlug` legacy** dans `lib/brvm/sources.ts` une fois que tous les call sites utilisent `getSourceBySlugDetailed`.
3. **`hts-cache/` du miroir HTTrack** n'est pas du code à supprimer — c'est local et déjà gitignored.

## 🎯 Périmètre du mega fix maintenance/downloader

Ce mega fix livre exclusivement ce qui manque, **sans toucher** ce qui marche déjà :

| Bloc | Livrable |
|---|---|
| Audit | `docs/BRVM_FINAL_AUDIT.md` (ce document) |
| Parser strategy | `docs/BRVM_PARSER_STRATEGY.md` + helpers réutilisables |
| URL patterns | `docs/BRVM_URL_PATTERNS.md` (catalogue exhaustif) |
| PDF downloader | `lib/brvm/pdf-downloader.ts` + `app/api/brvm/download/route.ts` + `scripts/download-brvm-pdfs.ts` + `docs/BRVM_DOWNLOADER.md` |
| Maintenance | `lib/brvm/maintenance.ts` + `app/api/brvm/maintenance/route.ts` + `scripts/brvm-health-check.ts` + `scripts/brvm-maintenance-report.ts` + `docs/BRVM_MAINTENANCE.md` |
| Admin V2 | Sous-pages `/admin/brvm/downloader` et `/admin/brvm/maintenance` |
| Routes refacto | `/api/brvm/{scrape,documents,download,maintenance}/...` (cohérence) |
| Docs durables | Updates `CLAUDE.md` (règles), `README.md`, `DEPLOY.md`, `CRON_SETUP.md` |

Tout le reste est intentionnellement intouché.
