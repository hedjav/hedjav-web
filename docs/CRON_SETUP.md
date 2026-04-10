# Configuration des taches CRON — egp.hedjav.com

Utiliser [cron-job.org](https://cron-job.org) (gratuit).

Chaque job doit inclure le header : `Authorization: Bearer [INTERNAL_API_TOKEN]`

| Job | URL | Methode | Frequence |
|-----|-----|---------|-----------|
| Processeur campagnes | `https://egp.hedjav.com/api/campaigns/process` | POST | Toutes les heures |
| Newsletter hebdo | `https://egp.hedjav.com/api/newsletter/weekly` | POST | Lundi 8h |
| Notifications email | `https://egp.hedjav.com/api/notifications/send-email` | POST | Toutes les 5 minutes |
| Rapport mensuel | `https://egp.hedjav.com/api/reports/monthly` | POST | 1er du mois, 7h |
| BRVM scrape (données+PDFs) | `https://egp.hedjav.com/api/brvm/scrape` | POST | Tous les jours, 18h00 |
| BRVM résumé IA + email | `https://egp.hedjav.com/api/brvm/summarize` | POST | Tous les jours, 18h30 |
| BRVM tout-en-un (scrape+IA) | `https://egp.hedjav.com/api/brvm/daily` | POST | Alternative : 18h (fait les 2) |
| BRVM digest hebdo | `https://egp.hedjav.com/api/brvm/weekly-digest` | POST | Vendredi, 19h |
| BRVM scan rapports | `https://egp.hedjav.com/api/brvm/reports-scan` | POST | Dimanche, 22h |

**Note BRVM :** Tu peux soit utiliser `/api/brvm/daily` (fait scrape+résumé ensemble), soit séparer en 2 crons :
- 18h00 : `/api/brvm/scrape` — télécharge les données et PDFs (PAS d'IA)
- 18h30 : `/api/brvm/summarize` — génère le résumé IA et envoie l'email (UTILISE l'IA)
