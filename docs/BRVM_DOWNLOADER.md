# BRVM — Téléchargeur PDF par période

Guide opérationnel du downloader PDF BRVM. **À la demande uniquement** — les PDFs ne sont jamais téléchargés par défaut, seulement quand un admin ou un cron explicite le demande pour une période donnée.

## Principe

- Par défaut, `brvm_documents` ne stocke que les **métadonnées** (titre, date, URL, checksum composite).
- Le downloader prend une **requête de période** (date début, date fin, types, sources), va chercher les PDFs matchés, les télécharge en binaire, les upload dans le bucket privé Supabase Storage `brvm-documents`, et enregistre le chemin dans `brvm_documents.metadata.storage_path`.
- **Idempotent** : relancer le même download = tous les PDFs déjà archivés sont skipped (`skipped_already_archived`).
- **Résilient** : si un PDF est 404, timeout, ou une source est down, le run continue et journalise l'échec précisément.

## Où sont stockés les PDFs

| Storage | Bucket | Accès |
|---|---|---|
| Fichier binaire | `brvm-documents` (privé, Supabase Storage) | Signed URL 5 min via `/api/brvm/download?document_id=XXX` |
| Métadonnée | `brvm_documents.metadata.storage_path` | Lecture via `/api/brvm/documents` |

Chemin canonique : `{doc_type}/{YYYY}/{YYYY-MM-DD}_{checksum8}.pdf`
Exemple : `boc/2026/2026-04-10_a3f9c2b1.pdf`

Pourquoi le checksum dans le nom : garantit l'unicité même si deux documents ont la même date, et permet de retrouver facilement un fichier à partir de sa fiche DB.

## Usage

### 1. Via l'UI admin `/admin/brvm/downloader`

Interface simple :
- Date début / date fin (defaults = derniers 7 jours)
- Types de document (checkboxes multi-select)
- Source (défaut : toutes)
- `Limit` (défaut 50, max 500)
- `Force` (re-télécharger si déjà archivé)
- Bouton **"Lancer le téléchargement"**

Résultat affiché : rapport détaillé par document (statut + taille + erreur éventuelle).

### 2. Via CLI (local ou VPS)

```bash
# Tous les BOC de janvier 2026
npx tsx scripts/download-brvm-pdfs.ts \
  --from=2026-01-01 --to=2026-01-31 --types=boc

# Les rapports annuels de 2025
npx tsx scripts/download-brvm-pdfs.ts \
  --from=2025-01-01 --to=2025-12-31 --types=rapport_annuel --limit=100

# Dry-run : liste seulement ce qui serait téléchargé
npx tsx scripts/download-brvm-pdfs.ts \
  --from=2026-01-01 --to=2026-04-10 --dry-run

# Verbose : affiche chaque item traité
npx tsx scripts/download-brvm-pdfs.ts \
  --from=2026-04-01 --to=2026-04-10 --types=boc --verbose
```

### 3. Via l'API (pour un cron externe ou un agent IA)

```bash
curl -X POST https://egp.hedjav.com/api/brvm/download \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from": "2026-01-01",
    "date_to": "2026-04-10",
    "doc_types": ["boc"],
    "limit": 100
  }'
```

Réponse : `DownloadReport` complet avec counts et items détaillés.

### 4. Récupérer un PDF archivé depuis l'admin

```
GET /api/brvm/download?document_id={uuid}
```

Redirige vers une signed URL Supabase valide 5 minutes. Utilisé par le bouton "Voir le fichier" dans l'UI admin.

## Statuts possibles par item

| Status | Signification |
|---|---|
| `downloaded` | PDF téléchargé et archivé en Storage |
| `skipped_already_archived` | Déjà archivé, rien à faire (relance idempotente) |
| `skipped_no_pdf_url` | Document référencé en DB mais sans `pdf_url` |
| `missing` | URL retourne 404 — PDF supprimé côté BRVM |
| `error` | Erreur réseau, timeout, ou erreur upload Storage |

## Contraintes respectées

- **Priorité sources** : le downloader filtre par `source_slug` quand demandé, mais l'ordre naturel reste `brvm-org > bfin > sikafinance` (priorité décroissante).
- **Priorité BOC** : un admin qui lance sans `--types` doit commencer par les BOC (les requêtes par défaut sont triées `doc_date DESC`, donc les plus récents d'abord, BOC dominant en volume récent).
- **Rate limiting poli** : 200ms de pause entre téléchargements — un run de 100 PDFs prend ~20s minimum pour ne pas saturer brvm.org.
- **Pas de PDF en base** : stockage exclusivement dans Supabase Storage (pas en `bytea`).
- **Checksum binaire** : calculé à la volée (`computeFileChecksum(buffer)`) et stocké dans `metadata.file_checksum` pour vérification d'intégrité.

## Configuration Supabase Storage

Le bucket `brvm-documents` est créé par :
- Migration 019 ou
- Filet de sécurité dans migration 020/023

Politique actuelle : **privé**. Aucune policy publique. Le service-role (utilisé par les routes API et les scripts) bypass RLS et écrit/lit directement.

Pour vérifier manuellement :
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'brvm-documents';
-- Doit retourner : brvm-documents | brvm-documents | false
```

## Troubleshooting

### "Document non archivé" (404 sur `GET /api/brvm/download?document_id=...`)

Le document existe en base mais n'a pas encore été téléchargé. Lance un downloader par période qui couvre cette date :
```bash
npx tsx scripts/download-brvm-pdfs.ts --from={doc_date} --to={doc_date} --types={doc_type}
```

### Tous les items ressortent en `error`

Probable : le service-role key est invalide, ou le bucket n'existe pas. Vérifie :
```sql
SELECT * FROM storage.buckets WHERE id = 'brvm-documents';
```

### Beaucoup de `missing`

Probable : le scraper a indexé d'anciens PDFs dont les URLs ne sont plus valides côté BRVM. Pas un bug — c'est la réalité des sources externes. Le downloader journalise proprement et l'admin peut décider de purger les docs concernés.

### Le run est très long sur beaucoup de documents

Rappel : c'est séquentiel volontairement (200ms entre items). Un run de 500 PDFs peut prendre 15-20 min. Pour un refresh historique massif, préférer le script CLI en arrière-plan plutôt que l'UI admin.

## Limites connues V1

1. **Pas de reprise sur interruption** — si un run plante à mi-parcours, re-lancer = repartir de zéro (mais le `skipped_already_archived` rend ça rapide).
2. **Pas de priorité multi-source fallback** — si `brvm.org` est down, le downloader ne tente pas automatiquement `bfin`. Il faut filtrer `--sources=bfin` manuellement.
3. **Pas de suppression** — on archive, on n'efface jamais. Cleanup manuel via le bucket Storage si besoin.
4. **Pas de vérification de contenu** — on vérifie la taille (>500 bytes) et le content-type, mais pas le PDF en profondeur. Un faux PDF passerait.
5. **Pas de parallélisation** — volontaire pour rester poli avec brvm.org. Si on veut accélérer : diminuer le délai ou paralléliser à 2-3 workers max.
