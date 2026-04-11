# BRVM — Veille documentaire Hedjav

Guide opérationnel de la brique **veille BRVM** de Hedjav : quelles tables, quelles routes, quels crons, comment uploader un backfill historique et comment dépanner.

## Vue d'ensemble

La veille BRVM tracke les publications de `brvm.org` (priorité), `bfin.brvm.org` et `sikafinance.com`. Elle stocke **uniquement les métadonnées** (titre + date + URL + checksum SHA256), jamais les PDFs. La priorité métier est le **Bulletin Officiel de la Cote (BOC)**.

## Schéma de données

Deux tables distinctes :

| Table | Rôle | Migration |
|---|---|---|
| `brvm_data` | Données marché (cours actions, indices, résumé séance) stockées en JSON | 019 + filet 020 |
| `brvm_sources` | Sources hiérarchisées par priorité (brvm-org=10, bfin=20, sikafinance=30) | 020 |
| `brvm_documents` | Documents de veille dédupliqués par `checksum` UNIQUE | 020 |

### `brvm_documents` — colonnes clés

- `source_id` → jointure `brvm_sources`
- `doc_type` : `boc | rapport_annuel | rapport_trimestriel | rapport_semestriel | communique | annonce | note_information | avis | autre`
- `title`, `description`, `doc_date`
- `source_url` (page HTML où le doc a été découvert), `pdf_url` (lien direct)
- `issuer_slug`, `issuer_name` (pour les rapports et communiqués société cotée)
- `checksum` text UNIQUE — SHA256 composite `source|pdf_url||source_url|title`
- `is_new` boolean — passe à false quand l'admin clique « Traiter »
- `is_processed` boolean, `processed_at`, `processed_by`
- `discovered_at`, `published_at`
- `metadata jsonb` — extensibilité (scoring IA futur, tags, etc.)

### Dédup par checksum

On calcule `SHA256(source_slug | pdf_url_ou_source_url | title_normalisé)` via `lib/brvm/checksum.ts`. Re-scraper la même URL 1000 fois = 1 ligne. Si un PDF est republié sous une nouvelle URL, le checksum change → nouvelle ligne (correct).

### Notification admin

Un trigger PG (`notify_new_brvm_document`) insère automatiquement une ligne dans `admin_notifications` à chaque INSERT sur `brvm_documents`. Les BOC sont marqués `priority='high'`, les autres `normal`. Impossible d'oublier de notifier : c'est au niveau DB.

## Routes API

| Route | Méthode | Auth | Rôle |
|---|---|---|---|
| `/api/brvm/scrape` | POST | Bearer `INTERNAL_API_TOKEN` | Orchestrateur : market data + BOC + rapports + annonces en un appel |
| `/api/brvm/scrape/boc` | POST | Bearer | BOC uniquement (priorité métier) |
| `/api/brvm/scrape/rapports` | POST | Bearer | Rapports société cotée |
| `/api/brvm/scrape/annonces` | POST | Bearer | Toutes catégories annonces |
| `/api/brvm/documents` | GET | Session admin | Liste paginée pour l'admin UI |
| `/api/brvm/documents/[id]/process` | POST | Session admin | Marque un document traité |
| `/api/brvm/summarize` | POST | Bearer | Résumé IA + email admins (inchangé) |
| `/api/brvm/weekly-digest` | POST | Bearer | Synthèse hebdo → article brouillon (inchangé) |
| `/api/admin/brvm-trigger` | POST | Session admin | Proxy vers `/api/brvm/scrape` pour le bouton "Lancer la veille" |

### Routes supprimées

| Ancienne route | Remplacée par |
|---|---|
| `POST /api/brvm/daily` | `POST /api/brvm/scrape` (orchestrateur) |
| `POST /api/brvm/reports-scan` | `POST /api/brvm/scrape/rapports` |

## Admin UI `/admin/brvm`

Structure v1 :

1. **KPIs** : Nouveaux BOC aujourd'hui · Nouveaux BOC 7j · Total documents indexés · Nouveautés à traiter
2. **État sources** : une ligne par source (brvm-org / bfin / sikafinance) avec pastille verte/rouge + dernière tentative
3. **Tabs** : Tous · Nouveautés · BOC · Rapports · Annonces · Communiqués (compteur par tab)
4. **DataTable** : type (badge coloré), date doc, titre + émetteur, source, statut (Nouveau/Traité), actions (PDF ↗ / Traiter)
5. **Bouton "Lancer la veille"** en haut-droit → POST `/api/admin/brvm-trigger`

## Import historique

Le miroir HTTrack `hedjav-scrap/` (dans `.gitignore`, **jamais versionné**, 236 MB) contient l'historique des publications brvm.org.

```bash
# Dry run (rien n'est inséré, affiche ce qui serait fait)
npx tsx scripts/import-brvm-history.ts --dry-run

# Import réel
npx tsx scripts/import-brvm-history.ts
```

Le script :
- Lit récursivement `hedjav-scrap/hedjav-scrap/www.brvm.org/`
- Pour chaque `.pdf` : classifie (BOC / rapport / annonce…), extrait la date depuis le nom de fichier, calcule le checksum, insère via `upsertDocument()`
- Idempotent : re-lancer 10 fois = même nombre de lignes en base

**⚠️ Ne jamais exécuter en production.** Le script lit des fichiers qui n'existent que sur la machine locale.

## Crons recommandés

À configurer côté VPS (voir `docs/CRON_SETUP.md`) ou Supabase Edge Functions :

| Tâche | Fréquence | Endpoint |
|---|---|---|
| Scrape BOC | Tous les jours 18h UTC | `/api/brvm/scrape/boc` |
| Scrape annonces | Tous les jours 19h UTC | `/api/brvm/scrape/annonces` |
| Scrape rapports | Dimanche 22h UTC | `/api/brvm/scrape/rapports` |
| Résumé IA | Tous les jours 20h UTC | `/api/brvm/summarize` (nécessite `ANTHROPIC_API_KEY`) |
| Weekly digest | Lundi 08h UTC | `/api/brvm/weekly-digest` |

Alternative simple : **un seul cron quotidien** qui appelle `/api/brvm/scrape` (orchestrateur qui fait BOC + rapports + annonces + market data en séquence).

## Troubleshooting

### « Could not find the table 'public.brvm_data' »

La migration 019 n'a jamais été appliquée en prod. Deux solutions :
1. Appliquer la migration 020 seule : elle contient un filet de sécurité qui crée `brvm_data` si absente (`CREATE TABLE IF NOT EXISTS`).
2. Appliquer 019 puis 020 dans l'ordre.

### « Source brvm-org introuvable »

La migration 020 n'a pas été appliquée, ou le seed initial a échoué. Vérifier :
```sql
SELECT slug, name, priority FROM brvm_sources;
```
Doit retourner 3 lignes : `brvm-org`, `bfin`, `sikafinance`.

### Le trigger "Lancer la veille" ne retourne rien

brvm.org est régulièrement down. Vérifier les logs PM2 :
```bash
pm2 logs hedjav-web | grep brvm
```
Regarder les warnings `[brvm-org] HTTP XXX` pour identifier quelle section échoue.

### Les documents arrivent mais sans date

Normal pour certains types : la date d'un communiqué ou d'une annonce dépend du HTML de brvm.org. Le parseur supporte ISO (`YYYY-MM-DD`), FR (`DD/MM/YYYY`), littéral (`10 avril 2026`). Si la date reste nulle, c'est que le HTML ne l'expose pas dans un format reconnu — ajouter un pattern dans `parseDateText()` de `lib/brvm/scrapers/brvm-org.ts`.

## Sécurité

- Le dossier `/hedjav-scrap/` est dans `.gitignore` et ne doit **jamais** être commité. Vérifier avant chaque commit : `git check-ignore -v hedjav-scrap/` doit afficher la règle.
- Les routes `/api/brvm/scrape*` exigent `Bearer INTERNAL_API_TOKEN`. Ne jamais logger ce token.
- Les routes admin (`/api/brvm/documents`, `/process`) vérifient `profile.role='admin'` côté serveur.
- `brvm_documents` a une RLS `admin only` — le service-role bypass pour les cron scrapers.
