# Configuration des taches CRON — egp.hedjav.com

Utiliser [cron-job.org](https://cron-job.org) (gratuit).

Chaque job doit inclure le header : `Authorization: Bearer [INTERNAL_API_TOKEN]`

| Job | URL | Methode | Frequence |
|-----|-----|---------|-----------|
| Processeur campagnes | `https://egp.hedjav.com/api/campaigns/process` | POST | Toutes les heures |
| Newsletter hebdo | `https://egp.hedjav.com/api/newsletter/weekly` | POST | Lundi 8h |
| Notifications email | `https://egp.hedjav.com/api/notifications/send-email` | POST | Toutes les 5 minutes |
| Rapport mensuel | `https://egp.hedjav.com/api/reports/monthly` | POST | 1er du mois, 7h |
