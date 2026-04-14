# Configuration des tâches CRON — egp.hedjav.com

Utiliser [cron-job.org](https://cron-job.org) (gratuit).

Chaque job doit inclure le header : `Authorization: Bearer [INTERNAL_API_TOKEN]`

## Jobs généraux

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| Processeur campagnes | `https://egp.hedjav.com/api/campaigns/process` | POST | Toutes les heures |
| Newsletter hebdo | `https://egp.hedjav.com/api/newsletter/weekly` | POST | Lundi 8h |
| Notifications email | `https://egp.hedjav.com/api/notifications/send-email` | POST | Toutes les 5 minutes |
| Rapport mensuel | `https://egp.hedjav.com/api/reports/monthly` | POST | 1er du mois, 7h |
| Auto-cancel purchases pending | `https://egp.hedjav.com/api/admin/purchases/cancel-stale?hours=2` | POST | Toutes les heures |

### Auto-cancel purchases pending

Quand un client initie un paiement FedaPay puis annule (ferme l'onglet,
clique "Retour", le timer expire), la purchase reste en `status='pending'`
indéfiniment et polue le dashboard. Ce cron marque comme `failed` avec
`raw_payload.cancelled=true` toutes les pending > 2h.

Header : `Authorization: Bearer [INTERNAL_API_TOKEN]`

Paramètres :
- `hours` (défaut 2) — âge minimum pour canceller
- `dry_run=true` — simulation sans modifier la DB

Alternative CLI locale : `npx tsx scripts/cancel-stale-purchases.ts --hours=2`

## Veille BRVM (refonte 2026-04)

Voir [`BRVM.md`](./BRVM.md) (guide unifié) pour le détail du schéma, des routes et de l'admin.

### ⚠️ Important — utiliser `/scrape/async` pour les cronjobs

`POST /api/brvm/scrape` est **synchrone** et peut prendre 30 à 90 secondes (scrape complet + upserts Supabase). Les cronjobs externes comme cron-job.org timeoutent à 30s — ils recevraient une erreur alors que le scrape continue côté serveur.

**Solution** : route dédiée `POST /api/brvm/scrape/async` qui retourne `202 Accepted` en <100ms et continue le scrape en arrière-plan. Le résultat final est logué dans les logs Passenger et inséré dans `admin_notifications`.

Pourquoi une route dédiée au lieu d'un query param `?async=1` : **cron-job.org (free tier) refuse les URLs avec query params** dans le formulaire de création de cron. Une URL propre passe sans friction.

**Règle simple** :
- **Bouton admin "Lancer la veille"** → `POST /api/brvm/scrape` (mode sync, affiche le résultat immédiat)
- **Cron externe** → `POST /api/brvm/scrape/async` (fire-and-forget, zéro timeout)

### Cron jobs BRVM (URL corrigée pour cron-job.org)

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| BRVM veille orchestrateur | `https://egp.hedjav.com/api/brvm/scrape/async` | POST | Tous les jours, 18h00 |
| BRVM résumé IA + email | `https://egp.hedjav.com/api/brvm/summarize` | POST | Tous les jours, 18h30 |
| BRVM digest hebdo | `https://egp.hedjav.com/api/brvm/weekly-digest` | POST | Vendredi, 19h |

`/api/brvm/scrape` est l'orchestrateur unifié qui fait :
- Market data (cours, indices, résumé séance) → table `brvm_data`
- BOC → table `brvm_documents`
- Rapports société cotée → table `brvm_documents`
- Annonces (toutes catégories) → table `brvm_documents`

En un seul appel, avec dédup SHA256 automatique.

**Option 2 — Crons séparés (contrôle fin) :**

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| BRVM BOC quotidien | `https://egp.hedjav.com/api/brvm/scrape/boc` | POST | Tous les jours, 18h00 |
| BRVM annonces quotidiennes | `https://egp.hedjav.com/api/brvm/scrape/annonces` | POST | Tous les jours, 19h00 |
| BRVM rapports hebdo | `https://egp.hedjav.com/api/brvm/scrape/rapports` | POST | Dimanche, 22h00 |
| BRVM résumé IA + email | `https://egp.hedjav.com/api/brvm/summarize` | POST | Tous les jours, 18h30 |
| BRVM digest hebdo | `https://egp.hedjav.com/api/brvm/weekly-digest` | POST | Vendredi, 19h00 |

## Routes supprimées (ne pas utiliser)

| Ancienne route | Remplacée par |
|---|---|
| `/api/brvm/daily` | `/api/brvm/scrape` (orchestrateur) |
| `/api/brvm/reports-scan` | `/api/brvm/scrape/rapports` |

Si tu avais ces crons configurés, supprime-les ou mets à jour les URLs.

## Maintenance BRVM (recommandé)

Pour monitorer la santé de la brique BRVM, ajouter un cron toutes les 30 min :

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| BRVM health monitoring | `https://egp.hedjav.com/api/brvm/maintenance` | GET | Toutes les 30 minutes |

Header : `Authorization: Bearer [INTERNAL_API_TOKEN]`.

La réponse contient `report.overall_status` (`ok` / `warning` / `critical`). À utiliser dans un webhook vers Slack, un monitoring externe ou une simple alerte email si != `ok`. Voir [`BRVM.md`](./BRVM.md) § 10.

## PDF downloader BRVM (à la demande)

**⚠ Pas de cron par défaut** pour `/api/brvm/download`. Le téléchargement de PDFs se fait **à la demande** par l'admin depuis `/admin/brvm` (bouton « Archiver PDFs de la sélection » dans le hub) ou via CLI (`scripts/download-brvm-pdfs.ts`).

Si tu veux un refresh historique mensuel automatique (ex: re-scanner et archiver les BOC du mois), ajouter :

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| BRVM BOC archivage mensuel | `https://egp.hedjav.com/api/brvm/download` | POST | 1er du mois, 2h00 |

Avec body JSON :
```json
{
  "date_from": "2026-03-01",
  "date_to": "2026-03-31",
  "doc_types": ["boc"],
  "limit": 200
}
```

Voir [`BRVM.md`](./BRVM.md) § 5.

## Alertes email admin BRVM (nouveau, recommandé)

Trois digests structurés (tri décroissant par groupe, liens directs, IA optionnelle). Route commune : `POST /api/brvm/alerts/digest`, body JSON.

| Job | URL | Body | Fréquence |
|-----|-----|------|-----------|
| BRVM digest journalier | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"daily"}` | Tous les jours, 19h00 |
| BRVM digest hebdomadaire | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"weekly"}` | Vendredi, 18h00 |
| BRVM digest mensuel | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"monthly"}` | Le 1er du mois, 09h00 |

Header : `Authorization: Bearer [INTERNAL_API_TOKEN]`. Voir [`BRVM.md`](./BRVM.md) § 6.
