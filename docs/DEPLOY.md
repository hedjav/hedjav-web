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
1. `001_ebooks.sql` à `018_corrections_textes.sql`
2. `019_brvm_data.sql` — table brvm_data (données marché)
3. `020_brvm_refactor.sql` — **veille documentaire BRVM** : brvm_sources + brvm_documents + trigger notification (contient un filet qui crée brvm_data si 019 n'a jamais été appliquée)
4. `021_ebook_files.sql` — **fix livraison FedaPay** : ebooks.file_path + bucket privé `ebook-files` + policies RLS admin

Après la migration 020, vérifier :
- Dans Supabase > Table Editor : `brvm_sources` contient 3 lignes (brvm-org, bfin, sikafinance)
- Dans Supabase > Storage : bucket `ebook-files` existe et est **Private** (non Public)

Voir [`BRVM.md`](./BRVM.md) (guide unifié) pour le schéma complet, le dépannage, les health checks et les rapports.

## Vérification post-déploiement BRVM

Après chaque déploiement touchant la brique BRVM :
```bash
# Health check local (depuis le VPS ou en dev)
npx tsx scripts/brvm-health-check.ts

# Ou via l'API (remplace le token)
curl -s https://egp.hedjav.com/api/brvm/maintenance \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" | jq '.report.overall_status'
```

Si `overall_status` n'est pas `ok`, voir le rapport complet pour la recommandation précise.

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

---

## Pré-prod — Audit iceberg (leçons)

> Consolidation des fixes structurels pré-exploitation (fusion des anciens
> `ICEBERG_AUDIT_FIXES.md` + `PHASE_EXPLOITATION_CHECKLIST.md`).

### Correctifs structurels appliqués

| # | Problème racine | Fix |
|---|---|---|
| 1 | Liens email localhost en prod | Helper unique `lib/url.ts` → `siteUrl(path)`, fallback `https://egp.hedjav.com`. Jamais de fallback localhost. |
| 2 | Notifications `/admin` génériques | `admin_notifications.target_url` + `entity_type`/`entity_id`. Helper `lib/notifications/target-url.ts`. Trigger `notify_new_brvm_document` réécrit. |
| 3 | Sessions illimitées | `proxy.ts` lit `profiles.last_visit_at` + seuils env : `ADMIN_INACTIVITY_MIN=30`, `MEMBER_INACTIVITY_DAYS=7`. `InactivityMonitor` ping `/api/auth/activity-touch`. Voir `SESSION_SECURITY_POLICY.md`. |
| 4 | Crons 404 / docs contradictoires | Fusion doc cron unique. Retraits : `Sitemap Ping`, `BRVM Daily`, `BRVM Reports Scan`. Ajout 3 digests BRVM + supervision 30 min. |
| 5 | Logs IA peu exploitables | CHECK élargi `success\|error\|skipped\|warning`. UI `/admin/ia` avec 6 KPIs + filtres + détail expansible. Indexes `idx_ai_logs_action_created`. |
| 6 | Maintenance BRVM passive | `/api/brvm/maintenance` notifie auto sur `warning/critical` (dédup 6 h). |
| 7 | Centre BRVM trop technique | Refonte 4 univers (voir `BRVM.md` § 1bis). |
| 8 | Alertes fréquence unique | Multi-checkbox daily/weekly/monthly. Persistance `admin_settings.brvm_alert_frequencies`. |
| 9 | Bio publique 17 ans vs 13 ans | `UPDATE site_config SET value = replace(value, '17 ans', '13 ans')` + fallback fichiers alignés. **CLAUDE.md : 13 ans partout**. |

### Couche IA unifiée

- `lib/ai/client.ts` — `generateText()` multi-provider (DeepSeek > OpenAI > Anthropic).
- Auto-détection via `AI_PROVIDER=auto`. Dégradation propre (`{ ok: false, skipped: true }`).
- Sanitization logs : clés redactées (`sk-***REDACTED***`, `Bearer ***REDACTED***`).
- Timeouts 60 s + `AbortController`. Usage reporting (tokens, durée, provider).
- Journalisation best-effort dans `ai_logs`.

Variables env :
```bash
AI_PROVIDER=auto
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Checklist recette initiale (à exécuter post-déploiement)

- [ ] Appliquer migrations pendantes (`024_content_exploitation`, `025_brvm_alerts`, `026_iceberg_audit`, et refonte BRVM `027/028/029`)
- [ ] Seeds : `node scripts/seed-ebooks.mjs`, `seed-articles.mjs`, `seed-pages.mjs`, `seed-first-campaign.mjs`
- [ ] Renseigner au moins une clé IA dans `.env.local`
- [ ] Configurer pop-up lead magnet via `/admin/popup`
- [ ] Activer campagne Bienvenue depuis `/admin/campagnes`
- [ ] Configurer cron-job.org (voir `CRON_SETUP.md`)

### Risques connus à surveiller

- Rotation périodique `FEDAPAY_API_KEY`, `INTERNAL_API_TOKEN`, `FEDAPAY_WEBHOOK_SECRET`.
- Vérifier SPF/DKIM sur `egp.hedjav.com` pour éviter emails en spam.
- Seeds `upsert({ onConflict: 'slug' })` : contenu remplacé si slug existe. Précaution prod.

### Commandes de recette rapides

```bash
# Type-check complet
npx tsc --noEmit --skipLibCheck

# Build prod
npm run build

# Health check BRVM
curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  https://egp.hedjav.com/api/brvm/maintenance | jq '.report.overall_status'

# Test IA (dry run via newsletter)
curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' \
  https://egp.hedjav.com/api/newsletter/send
```
