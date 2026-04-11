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

## Veille BRVM (refonte 2026-04)

Voir [`BRVM_ADMIN.md`](./BRVM_ADMIN.md) pour le détail du schéma, des routes et de l'admin.

**Option 1 — Un seul cron simple (recommandé) :**

| Job | URL | Méthode | Fréquence |
|-----|-----|---------|-----------|
| BRVM veille orchestrateur | `https://egp.hedjav.com/api/brvm/scrape` | POST | Tous les jours, 18h00 |
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
