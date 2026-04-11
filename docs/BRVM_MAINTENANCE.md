# BRVM — Maintenance et health check

Système de maintenance et d'amélioration continue de la brique BRVM. Détecte les régressions, vérifie les tables, les sources, les routes, et produit des rapports actionnables.

## Vue d'ensemble

Trois points d'entrée pour l'état de santé BRVM :

| Voie | Usage | Sortie |
|---|---|---|
| `GET /api/brvm/maintenance` | Monitoring auto + UI admin | JSON (MaintenanceReport) |
| `npx tsx scripts/brvm-health-check.ts` | Local / CI / cron quick check | Texte concis + exit code |
| `npx tsx scripts/brvm-maintenance-report.ts` | Rapport archivable Markdown | Fichier `.brvm-reports/*.md` |

Tous utilisent le même module `lib/brvm/maintenance.ts` pour garantir la cohérence du diagnostic.

## Ce que le système vérifie

### 1. Tables présentes et accessibles
- `brvm_sources` existe et est queryable
- `brvm_documents` existe et est queryable
- Détecte les erreurs Supabase code `42P01` / `PGRST205` et pointe directement vers la migration 023.

### 2. Sources seedées et fraîches
- Les 3 slugs attendus sont présents : `brvm-org`, `bfin`, `sikafinance`
- Pour chaque source : dernier `last_success_at`, `last_error`
- Seuils :
  - **OK** : dernier succès < 48h
  - **Warning** : dernier succès entre 48h et 7j OU jamais scrapée
  - **Critical** : dernier succès > 7j OU jamais aucun succès
- Chaque check warning/critical porte un `hint` actionable.

### 3. Documents indexés
- Total documents
- Par doc_type, par source
- Nouveautés découvertes < 24h et < 7j
- Backlog non traité (is_processed = false)
- PDFs archivés vs non archivés (via `metadata.storage_path`)

### 4. Fraîcheur des découvertes
- Au moins 1 document découvert dans les 7 derniers jours
- BOC présents (priorité métier)
- Backlog de nouveautés < 50 (seuil warning)

## Statuts globaux

Un rapport a un `overall_status` agrégé :

| Status | Signification | Exit code CLI |
|---|---|---|
| `ok` | Tout est vert | 0 |
| `warning` | Au moins 1 check warning, aucun critical | 1 |
| `critical` | Au moins 1 check critical | 2 |
| `unknown` | Erreurs inhabituelles pendant les checks | 3 |

## Usage

### Via l'API

```bash
# Session admin (cookie) depuis un navigateur déjà connecté
curl -s https://egp.hedjav.com/api/brvm/maintenance | jq

# Bearer token (pour cron ou agent IA)
curl -s https://egp.hedjav.com/api/brvm/maintenance \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" | jq '.report.overall_status'
```

Réponse :
```json
{
  "ok": true,
  "report": {
    "generated_at": "2026-04-11T00:00:00.000Z",
    "overall_status": "warning",
    "summary": { "checks_passed": 8, "checks_warning": 1, "checks_critical": 0 },
    "checks": [
      { "id": "table_brvm_sources", "label": "...", "status": "ok", "detail": "..." }
    ],
    "sources": [
      { "slug": "brvm-org", "last_success_at": "...", "hours_since_last_success": 12.3, "status": "ok" }
    ],
    "documents": {
      "total": 215, "by_type": {...}, "new_today": 3, "unprocessed": 8,
      "pdfs_archived": 21, "pdfs_not_archived": 194
    },
    "recommendations": [
      "[Archivage PDF] Utilise /admin/brvm → Downloader pour archiver les fichiers."
    ]
  }
}
```

### Via CLI (rapide)

```bash
# Rapport texte formaté + exit code (utilisable dans un cron CI)
npx tsx scripts/brvm-health-check.ts

# Sortie JSON (pour un pipeline monitoring)
npx tsx scripts/brvm-health-check.ts --json

# Mode quiet (une ligne — idéal pour un cron silencieux)
npx tsx scripts/brvm-health-check.ts --quiet
```

Exit codes :
- `0` → OK
- `1` → warning(s) présent(s)
- `2` → critical(s) présent(s)
- `3` → erreur pendant l'exécution du script lui-même

### Via CLI (rapport archivable)

```bash
# Génère un rapport Markdown archivé dans .brvm-reports/
npx tsx scripts/brvm-maintenance-report.ts

# Juste sur stdout (pour intégrer dans un autre pipeline)
npx tsx scripts/brvm-maintenance-report.ts --stdout > /tmp/report.md
```

Le dossier `.brvm-reports/` est **gitignored** — les rapports sont pour audit local uniquement.

## Cadence recommandée

| Fréquence | Outil | Objectif |
|---|---|---|
| Toutes les 30 min | `GET /api/brvm/maintenance` via cron-job.org | Monitoring externe, alerte si status != ok |
| Quotidienne | `scripts/brvm-health-check.ts --quiet` via cron VPS | Log système / log rotation |
| Hebdomadaire | `scripts/brvm-maintenance-report.ts` manuel ou cron | Rapport archivable pour suivi trend |
| Ponctuelle | `npx tsx scripts/brvm-health-check.ts` | Après chaque modification du scraper |

Le cron toutes les 30 min peut être une simple requête GET sur `/api/brvm/maintenance` avec header `Authorization: Bearer $INTERNAL_API_TOKEN`. En cas de `ok: true` avec `overall_status != 'ok'`, une notification peut être déclenchée côté monitoring (non implémenté dans cette V1 — à faire selon stratégie future).

## Codes de check (référence)

Les `check.id` stables permettent de tracker individuellement dans un monitoring :

| ID | Source | Warning si | Critical si |
|---|---|---|---|
| `table_brvm_sources` | Tables | — | Table absente |
| `table_brvm_documents` | Tables | — | Table absente |
| `source_seed_{slug}` | Sources | — | Slug manquant en DB |
| `source_fresh_{slug}` | Sources | Dernier succès > 48h ou jamais scrapée | > 7j ou aucun succès |
| `docs_total` | Documents | 0 document | — |
| `docs_boc` | Documents | 0 BOC | — |
| `docs_fresh` | Documents | Aucun doc découvert dans les 7j | — |
| `docs_unprocessed` | Documents | Backlog > 50 | — |

## Troubleshooting

### `GET /api/brvm/maintenance` retourne `overall_status: critical` avec `table_brvm_sources: critical`

Les tables ne sont pas présentes. Applique `supabase/migrations/023_brvm_clean_reset.sql` puis relance.

### Le rapport dit `source_fresh_brvm-org: critical` mais les autres sources sont OK

brvm.org a probablement refusé les connexions ou leur structure HTML a changé. Procédure :
1. `curl -sL https://www.brvm.org/fr/bulletins-officiels-de-la-cote.html | head -50` → vérifie que la page répond
2. Si oui : `docs/BRVM_PARSER_STRATEGY.md` § "Stratégie face aux évolutions du HTML live"
3. Si non (timeout / 5xx) : attendre quelques heures, c'est probablement transitoire

### Le CLI quiet exit 1 mais rien ne semble mal

C'est un warning, pas un critical. Relance avec le format texte pour voir les détails :
```bash
npx tsx scripts/brvm-health-check.ts
```

### Trop de `docs_unprocessed`

Le backlog s'accumule. Soit :
- Aller sur `/admin/brvm` → onglet "Nouveautés" et cliquer "Traiter" sur ce qui est pertinent
- Ou exécuter un script de bulk-mark (non livré en V1, à coder selon besoin)

## Évolution future

Cette V1 couvre l'essentiel. Propositions pour V2 (non implémentées) :
1. **Monitoring externe** — push vers Sentry / PagerDuty / Slack sur transition `ok → critical`
2. **Historique des reports** en DB (`brvm_maintenance_runs`) pour tracer l'évolution dans le temps
3. **Auto-remédiation** — exemple : si une source est critical > 48h, tenter automatiquement une ré-initialisation (re-lancement scrape + re-authentification si applicable)
4. **Alerte gap BOC** — détecter si des jours ouvrés manquent dans la séquence des BOC indexés (critique métier)
5. **Comparaison miroir HTTrack** — détecter si des PDFs sont dans le miroir local mais absents de `brvm_documents` (lacunes dans l'indexation)
