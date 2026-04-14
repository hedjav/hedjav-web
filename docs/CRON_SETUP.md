# Configuration des tâches CRON — egp.hedjav.com

Service utilisé : [cron-job.org](https://cron-job.org) (plan gratuit, suffisant).
Auth standard sur toutes les routes privées : header `Authorization: Bearer <INTERNAL_API_TOKEN>`.

> Ce document remplace l'ancien `docs/ACTIONS_MANUELLES.md` (fusionné ici en avril 2026 dans le cadre de l'audit iceberg). Les actions hors-cron restent dans cette page en § 10.

---

## 1. Jobs essentiels (auto, à configurer en priorité)

Ces 5 jobs couvrent l'exploitation quotidienne du site.

| # | Nom | URL | Méthode | Fréquence |
|---|-----|-----|---------|-----------|
| 1 | Processeur campagnes | `https://egp.hedjav.com/api/campaigns/process` | POST | Toutes les heures |
| 2 | Newsletter hebdo | `https://egp.hedjav.com/api/newsletter/weekly` | POST | Lundi 8h UTC |
| 3 | Notifications email | `https://egp.hedjav.com/api/notifications/send-email` | POST | Toutes les 5 min |
| 4 | Rapport mensuel | `https://egp.hedjav.com/api/reports/monthly` | POST | 1er du mois, 7h UTC |
| 5 | Auto-cancel purchases pending | `https://egp.hedjav.com/api/admin/purchases/cancel-stale?hours=2` | POST | Toutes les heures |

---

## 2. Veille BRVM (Centre de Veille — auto)

Architecture actuelle (après PR #69). Voir [`BRVM.md`](./BRVM.md) pour le détail.

**Règle** : utiliser `/api/brvm/scrape/async` (retourne 202 en <100 ms) pour les crons. La variante synchrone `/api/brvm/scrape` est réservée au bouton admin "Lancer la veille" — cron-job.org timeoute à 30 s sur sync.

| # | Nom | URL | Body | Fréquence |
|---|-----|-----|------|-----------|
| 6 | BRVM scrape orchestrateur | `https://egp.hedjav.com/api/brvm/scrape/async` | (vide) | Tous les jours, 18h UTC |
| 7 | BRVM digest journalier | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"daily"}` | Tous les jours, 19h UTC |
| 8 | BRVM digest hebdomadaire | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"weekly"}` | Vendredi, 18h UTC |
| 9 | BRVM digest mensuel | `https://egp.hedjav.com/api/brvm/alerts/digest` | `{"frequency":"monthly"}` | 1er du mois, 9h UTC |
| 10 | BRVM supervision | `https://egp.hedjav.com/api/brvm/maintenance` | (GET) | Toutes les 30 min |

> Les trois digests (daily/weekly/monthly) sont **cumulables et tous actifs par défaut**. Chacun tire sa propre période de documents et envoie un email groupé par catégorie (BOC / rapports / communiqués / avis / annonces / notes), trié en décroissant avec liens directs. L'analyse IA est optionnelle (DeepSeek prioritaire).

> La supervision génère des `admin_notifications` de type `brvm_alert` quand une source n'est pas fraîche, quand le scrape échoue plusieurs fois ou quand le backlog dépasse le seuil (voir § 4 supervision ci-dessous).

---

## 3. Jobs optionnels / legacy

À ne configurer **que si besoin métier explicite**.

| Job | URL | Status | Décision |
|-----|-----|--------|----------|
| BRVM résumé IA legacy | `/api/brvm/summarize` | Legacy `brvm_data` | À garder tant que `brvm_data` est alimenté, sinon désactiver |
| BRVM digest hebdo legacy | `/api/brvm/weekly-digest` | Legacy `brvm_data` → article brouillon | Optionnel (remplacé fonctionnellement par le digest weekly actuel) |

---

## 4. Jobs supprimés / déplacés

| Ancien job | Raison |
|---|---|
| `BRVM Daily` → `/api/brvm/daily` | Route supprimée. Remplacée par `/api/brvm/scrape/async`. |
| `BRVM Reports Scan` → `/api/brvm/reports-scan` | Route supprimée. Déjà couverte par l'orchestrateur `/api/brvm/scrape/async`. |
| `Sitemap Ping` → `https://www.google.com/ping?sitemap=…` | **Retiré**. Endpoint Google `/ping` déprécié depuis juin 2023, sans alternative. Google indexe le sitemap tout seul. |
| `Scoring Articles` → `/api/articles/score` | **Passé en manuel**. Plus de cron automatique : l'admin lance le scoring à la demande depuis `/admin/ia/scoring` quand il y a un lot à noter. |

---

## 5. Jobs en exécution manuelle (ne PAS mettre en cron)

Ces actions restent humaines par choix produit.

| Action | Déclencheur admin |
|---|---|
| Scoring qualité articles | `/admin/ia/scoring` (bouton « Lancer le scoring ») |
| Archivage PDFs BRVM par période | `/admin/brvm` → bouton « Archiver PDFs de la sélection » |
| Génération d'articles IA | `/admin/ia/articles` |
| Import historique BRVM | `npx tsx scripts/import-brvm-history.ts` (local uniquement) |

---

## 6. Supervision externe

Monitor `GET /api/brvm/maintenance` toutes les 30 min depuis cron-job.org avec header `Authorization: Bearer <INTERNAL_API_TOKEN>`.

La réponse contient `report.overall_status` (`ok` / `warning` / `critical`). La route génère automatiquement une notification admin de type `brvm_alert` quand le statut passe de `ok` à autre (rupture) — pas besoin de webhook externe en V1.

Voir [`BRVM.md`](./BRVM.md) § 10.

---

## 7. Actions manuelles Cloudflare WAF

1. Dashboard Cloudflare → domaine `egp.hedjav.com`.
2. **Security > WAF** → activer les Managed Rules (gratuit).
3. Règle custom : protéger `/api/webhooks/*` contre les appels non-FedaPay.
4. **Security > Bots** → activer Bot Fight Mode.
5. **SSL/TLS > Edge Certificates** → Always Use HTTPS ON.

---

## 8. Google Search Console

1. Aller sur Search Console → ajouter la propriété `https://egp.hedjav.com`.
2. Vérifier via DNS (TXT dans Cloudflare).
3. Soumettre le sitemap : `https://egp.hedjav.com/sitemap.xml`.
4. Pas besoin de cron de "ping" — Google recrawl le sitemap automatiquement.

---

## 9. SPF / DKIM / DMARC (Hostinger SMTP)

### SPF
TXT `@` : `v=spf1 include:_spf.hostinger.com ~all`

### DKIM
Suivre la procédure Hostinger dans le panneau email. Copier les 2 CNAME (`default._domainkey` et `hostingermail._domainkey`) dans Cloudflare DNS (proxy **désactivé** orange).

### DMARC
TXT `_dmarc` : `v=DMARC1; p=none; rua=mailto:hedjav@gmail.com`

---

## 10. Gestion comptes admin

### Promouvoir un admin via SQL

Dans Supabase Dashboard → SQL Editor :

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'email@exemple.com';
```

### Rétrograder

```sql
UPDATE profiles SET role = 'member' WHERE email = 'email@exemple.com';
```

⚠ Ne jamais rétrograder le dernier admin (sinon plus aucun accès à `/admin`). L'UI `/admin/membres` applique cette garde.

---

## 11. Bucket Supabase Storage `brvm-documents`

Créé automatiquement par migration 019. Sinon manuellement :

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('brvm-documents', 'brvm-documents', false)
ON CONFLICT DO NOTHING;
```

Le bucket est **privé**. Accès via `/api/brvm/download` (signed URL 5 min).

---

## 12. Regenerer les clés FedaPay (incident)

1. FedaPay Dashboard → Paramètres > API → Générer une nouvelle clé.
2. VPS : éditer `.env.local`, modifier `FEDAPAY_API_KEY` et `FEDAPAY_WEBHOOK_SECRET`.
3. `pm2 reload hedjav-web`.
4. Tester un paiement sandbox avant bascule prod.
