# Actions manuelles - Guide pour l'administrateur

## 1. Configuration des CRON jobs (cron-job.org)

Connectez-vous sur [cron-job.org](https://cron-job.org) et creez les 6 crons suivants :

| # | Nom | URL | Methode | Frequence | Header |
|---|-----|-----|---------|-----------|--------|
| 1 | BRVM Daily | `https://hedjav.com/api/brvm/daily` | POST | Tous les jours a 18h00 UTC | `Authorization: Bearer <INTERNAL_API_TOKEN>` |
| 2 | BRVM Weekly Digest | `https://hedjav.com/api/brvm/weekly-digest` | POST | Chaque lundi a 08h00 UTC | `Authorization: Bearer <INTERNAL_API_TOKEN>` |
| 3 | Newsletter Hebdo | `https://hedjav.com/api/newsletter/send` | POST | Chaque mercredi a 09h00 UTC | `Authorization: Bearer <INTERNAL_API_TOKEN>` |
| 4 | Campagnes Drip | `https://hedjav.com/api/campaigns/process` | POST | Toutes les 6 heures | `Authorization: Bearer <INTERNAL_API_TOKEN>` |
| 5 | Scoring Articles | `https://hedjav.com/api/articles/score` | POST | Chaque dimanche a 02h00 UTC | Body: `{"all": true}` + Header `Authorization: Bearer <INTERNAL_API_TOKEN>` |
| 6 | Sitemap Ping | `https://www.google.com/ping?sitemap=https://hedjav.com/sitemap.xml` | GET | Chaque lundi a 06h00 UTC | Aucun |

Pour chaque cron :
1. Cliquez "Create cronjob"
2. Renseignez URL, methode, frequence
3. Dans "Request headers", ajoutez : `Authorization: Bearer VOTRE_TOKEN`
4. Activez la notification par email en cas d'echec

## 2. Cloudflare WAF

1. Connectez-vous sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selectionnez le domaine `hedjav.com`
3. Allez dans **Security > WAF**
4. Activez "Managed Rules" (gratuit)
5. Creez une regle personnalisee :
   - Nom : "Protect API routes"
   - Expression : `(http.request.uri.path contains "/api/webhooks/") and (not ip.src in {VOTRE_IP_FEDAPAY})`
   - Action : Challenge
6. Activez le Bot Fight Mode dans **Security > Bots**
7. Activez HTTPS obligatoire dans **SSL/TLS > Edge Certificates > Always Use HTTPS**

## 3. Google Search Console

1. Allez sur [Google Search Console](https://search.google.com/search-console)
2. Ajoutez la propriete `https://hedjav.com`
3. Verifiez via DNS (ajoutez le TXT record dans Cloudflare)
4. Une fois verifie, allez dans **Sitemaps**
5. Soumettez : `https://hedjav.com/sitemap.xml`
6. Verifiez que toutes les pages sont indexees apres quelques jours

## 4. Configuration SPF/DKIM sur Hostinger

### SPF
1. Connectez-vous au DNS Cloudflare
2. Ajoutez un enregistrement TXT :
   - Nom : `@`
   - Contenu : `v=spf1 include:_spf.google.com include:amazonses.com include:resend.com ~all`

### DKIM (Resend)
1. Connectez-vous sur [Resend](https://resend.com/domains)
2. Ajoutez le domaine `hedjav.com`
3. Resend vous donnera 3 enregistrements CNAME a ajouter dans Cloudflare
4. Ajoutez-les dans Cloudflare DNS (desactivez le proxy orange pour ces CNAME)
5. Retournez sur Resend et cliquez "Verify"

### DMARC
Ajoutez un enregistrement TXT :
- Nom : `_dmarc`
- Contenu : `v=DMARC1; p=none; rua=mailto:hedjav@gmail.com`

## 5. Regenerer les cles FedaPay

1. Connectez-vous sur [FedaPay Dashboard](https://dashboard.fedapay.com)
2. Allez dans **Parametres > API**
3. Cliquez "Generer une nouvelle cle"
4. Copiez la nouvelle cle secrete
5. Sur le VPS, modifiez `.env.local` :
   ```bash
   nano /var/www/hedjav-web/.env.local
   # Modifiez FEDAPAY_API_KEY et FEDAPAY_WEBHOOK_SECRET
   ```
6. Redemarrez l'application :
   ```bash
   cd /var/www/hedjav-web
   pm2 reload hedjav
   ```
7. Testez un paiement en sandbox avant de basculer en production

## 6. Promouvoir un admin via SQL

Si l'interface `/admin/membres` n'est pas accessible :

1. Connectez-vous au [Supabase Dashboard](https://supabase.com/dashboard)
2. Selectionnez le projet hedjav
3. Allez dans **SQL Editor**
4. Executez :
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'email@exemple.com';
   ```
5. L'utilisateur peut maintenant acceder a `/admin`

Pour retrograder :
```sql
UPDATE profiles SET role = 'member' WHERE email = 'email@exemple.com';
```

**Important** : Ne retrogradez jamais le dernier admin, sinon personne ne pourra acceder a l'interface.
