# Deploiement hedjav.com -- Guide complet

## Architecture

Client (navigateur) -> Hostinger Node.js (Next.js 16) -> Supabase (PostgreSQL + Auth + Storage) -> FedaPay (paiement mobile) -> SMTP Hostinger (emails)

## Prerequis

- Compte Hostinger avec hebergement Node.js
- Projet Supabase (free tier suffit pour demarrer)
- Compte FedaPay en mode live
- Domaine egp.hedjav.com configure chez Hostinger
- (Optionnel) Cle API Anthropic pour la generation IA

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL Supabase | https://xxx.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Cle anonyme Supabase | eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | Cle service role (secret) | eyJ... |
| INTERNAL_API_TOKEN | Token pour les routes internes | (generer un UUID ou hash) |
| ADMIN_SETUP_CODE | Code bootstrap premier admin | (generer un hash) |
| NEXT_PUBLIC_APP_URL | URL publique du site | https://egp.hedjav.com |
| SMTP_HOST | Serveur SMTP | smtp.hostinger.com |
| SMTP_PORT | Port SMTP | 465 |
| SMTP_USER | Utilisateur SMTP | noreply@egp.hedjav.com |
| SMTP_PASS | Mot de passe SMTP | (mot de passe email) |
| SMTP_FROM | Expediteur email | noreply@egp.hedjav.com |
| FEDAPAY_API_KEY | Cle API FedaPay (sk_live_...) | sk_live_xxx |
| FEDAPAY_WEBHOOK_SECRET | Secret webhook FedaPay | wh_live_xxx |
| ANTHROPIC_API_KEY | Cle API Claude (optionnel) | sk-ant-xxx |

## Deploiement Hostinger

1. Connecter le repo GitHub `hedjav/hedjav-web`
2. Configuration : Framework Next.js, branche main, Node 20.x
3. Build command : `npm run build`
4. Configurer toutes les variables d'environnement
5. Deployer

## Migrations Supabase

Executer dans l'ordre dans Supabase Dashboard -> SQL Editor :
1. `001_ebooks.sql` a `016_ai_logs.sql`

## Configuration Supabase

### SMTP Custom (Authentication -> Email Settings -> SMTP)
- Host: smtp.hostinger.com
- Port: 465
- User: noreply@egp.hedjav.com
- Password: (mot de passe email Hostinger)
- Sender: noreply@egp.hedjav.com

### Site URL et Redirect
- Site URL: https://egp.hedjav.com
- Redirect URLs: https://egp.hedjav.com/**, http://localhost:3000/**

### Templates Email
Copier les templates depuis `docs/supabase-email-templates.md` dans Authentication -> Email Templates.

## Configuration FedaPay

Dans FedaPay Dashboard -> Settings -> Webhooks :
- URL : `https://egp.hedjav.com/api/webhooks/fedapay`
- Evenements : transaction.approved, transaction.canceled, transaction.declined

## Taches Cron (cron-job.org)

| Tache | URL | Frequence | Headers |
|---|---|---|---|
| Campagnes | POST https://egp.hedjav.com/api/campaigns/process | Toutes les heures | Authorization: Bearer [TOKEN] |
| Newsletter | POST https://egp.hedjav.com/api/newsletter/weekly | Lundi 8h | Authorization: Bearer [TOKEN] |

## Post-deploiement

1. Creer un compte sur /register
2. Aller sur /admin-setup, entrer ADMIN_SETUP_CODE
3. Verifier /admin
4. Configurer /admin/popup (activer pop-up lead magnet)
5. Activer campagne dans /admin/campagnes
6. Configurer cron-job.org
