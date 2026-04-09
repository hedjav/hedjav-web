@AGENTS.md
# hedjav.com — Contexte projet pour Claude Code

## Positionnement
**hedjav.com — École en ligne de la Gestion de Patrimoine — Zone UEMOA**

Plateforme numérique centrale d'un écosystème intégrant ebooks, formations, analyses BRVM, club d'investissement, magazine HEDJAV Finance, SaaS MonPatrimoine, et future SGP. Cible : 174 M FCFA/an de revenus à maturité (Phase 4 — An 4).

Maître d'ouvrage : **Hermann D. AVAHOUIN** — analyste financier, 17 ans d'expérience BOA Bénin, fondateur KTALYZ Conseils, expert patrimoine UEMOA.
Maître d'œuvre : **KTALYZ SARL**.

## Vision 4 phases (cahier des charges V1.0 — Avril 2026)

| Phase | Période | Objectif | Budget total |
|---|---|---|---|
| **Phase 1 — Fondations** | M1–M6 | Communauté & Ebooks (site vitrine + e-commerce + auth) | 600k–950k FCFA |
| **Phase 2 — Académie & Club ETF** | M7–M18 | LMS, espace membres, abonnements, webinaires Zoom | 600k–900k FCFA |
| **Phase 3 — Hub SaaS & Consulting** | M19–M36 | MonPatrimoine SaaS (sous-domaine), booking Calendly, chatbot IA, widget BRVM live | 380k–650k FCFA |
| **Phase 4 — SGP & Rayonnement** | M37–M48 | Page SGP CREPMF, podcast, annuaire CGP, app mobile React Native | 300k–500k FCFA |

**Stack pérenne 2026–2029** : Next.js 16 + Supabase + TypeScript + Tailwind + SMTP Hostinger (email) + Claude API (génération contenu) + FedaPay + Cloudflare. Architecture pensée pour évoluer **sans refonte** : site vitrine → LMS → SaaS → app mobile (réutilise 80% du code via React Native).

---

## Stack technique

| Composant | Solution |
|-----------|---------|
| Framework | Next.js 16 App Router |
| Langage | TypeScript |
| Styles | Tailwind CSS v4 + CSS variables custom hedjav |
| Backend / BDD | Supabase (PostgreSQL + Auth + RLS) |
| Hébergement | **Hostinger VPS** — PM2 + Nginx (PAS Vercel) |
| CDN / DNS | Cloudflare |
| Email | **SMTP Hostinger** (nodemailer) — `noreply@egp.hedjav.com` — fallback console.log si SMTP_HOST vide |
| Génération contenu | **Claude API** (claude-sonnet-4-6) — newsletter hebdo, articles auto |
| Paiement | **FedaPay** (Wave, Orange Money, MTN MoMo, carte) |
| Versioning | GitHub — repo `hedjav/hedjav-web` |

---

## Identité visuelle

### Couleurs (variables CSS dans `app/globals.css`)
```
--n900: #1B2A4A   Navy primaire
--n950: #0D1628   Navy profond — admin, sidebar, footer
--g500: #C5A028   Or accent — CTA, badges
--cream:#F8F5EE   Fond de page
```

### Typographies (next/font dans `app/layout.tsx`)
```
--fd : 'Cormorant Garamond' — titres, hero, logo
--fb : 'DM Sans'            — corps, navigation, UI
--fm : 'DM Mono'            — prix FCFA, données BRVM
```

### Logo
`Hedjav` — texte brut, font Cormorant Garamond weight 600. ZÉRO décoration.

---

## Règles absolues de code

### CSS
- Variables CSS uniquement (`var(--n900)`) — jamais de couleurs brutes
- Tokens d'espacement (`var(--s4)`) — jamais de valeurs brutes
- **Interdit** : `.container` custom (collision Tailwind v4) → toujours `.hedjav-container`
- Fonts via `next/font/google` uniquement, jamais de `@import url`

### React / Next.js 16
- Server Components par défaut, `'use client'` uniquement si interaction
- Données via `lib/supabase/server.ts` côté serveur
- Jamais de secret dans le code → `.env.local` (ignoré par git)
- Langue : tout le contenu en français, `<html lang="fr">`
- `proxy.ts` (renommé depuis `middleware.ts` en Next 16) protège `/dashboard` et `/admin`

### Architecture extensible (RÈGLE TRANSVERSALE)
- **Rien n'est figé.** Tout contenu passe par Supabase, jamais hardcodé.
- Chaque table a un champ `metadata jsonb default '{}'` pour ajouter des données arbitraires sans migration (scoring IA, tags, A/B test, telemetry).
- Toutes les routes API (`/api/articles`, `/api/newsletter/subscribe`, `/api/purchases/init`, `/api/webhooks/fedapay`) sont conçues pour être appelables par un agent IA.
- L'admin UI a une section `/admin/ia` avec placeholders pour les futurs outils IA.

### Contacts publics
- **Email public unique** : `hedjav@gmail.com`
- **Privé jamais en front** : `ktalyzconseils@gmail.com`
- **Réseaux sociaux** : Facebook, Instagram, X, TikTok, WhatsApp `+22901978903630` (LinkedIn n'existe pas encore)

### Git
- Branches `feature/nom-feature`
- Commits courts en français
- Auto-accept en cours sur ce projet : crée branche → code → push → PR → merge sans demander

---

## Stack future à intégrer (Phases 2–4)

Selon le CDC, ces composants viendront s'ajouter dans les phases suivantes :

| Composant | Solution prévue | Phase |
|---|---|---|
| LMS / vidéo formations | **Mux** (streaming adaptatif) | 2 |
| Recherche full-text | **Typesense Cloud** | 2 |
| Booking webinaires/consulting | **Calendly API** | 2/3 |
| Chatbot IA patrimoine | **Vercel AI SDK + Claude API** | 3 |
| Cours BRVM live | Edge Function + Supabase Realtime | 3 |
| Analytics produit | **PostHog** (events, funnels, A/B) | 3 |
| Error tracking | **Sentry** | 3 |
| App mobile | **Expo + React Native** | 4 |
| Recherche IA SEO | JSON-LD + AEO long-form | 3 |

> Aucun de ces composants n'est encore branché. L'architecture actuelle (Phase 1) a été conçue pour les accueillir sans refonte (champs `metadata jsonb` partout, route groups extensibles, API IA-ready).

---

## Comptes & rôles
- Premier admin : créer un compte via `/register`, puis aller sur **`/admin-setup`** et saisir `ADMIN_SETUP_CODE` (`.env.local`).
- Promouvoir/rétrograder ensuite depuis `/admin/membres` (impossible de rétrograder le dernier admin).
- Le proxy `proxy.ts` protège `/admin` (admin role) et `/dashboard` (user connecté). `/admin-setup` n'est pas intercepté.

## Dashboard membre
- Header avec avatar 64px + tabs horizontales (Vue d'ensemble / Mes ebooks / Mes commandes / Outils / Alertes / Mon profil).
- 4 cards visuelles : ebooks, outils, progression (+ badge), alertes.
- `/dashboard/outils` : 2 simulateurs client-side (épargne avec graphique SVG, locatif UEMOA).
- `last_visit_at` mis à jour à chaque visite (migration 007) — sert pour les alertes.

## État d'avancement (Phase 1 — TERMINÉE ✅)

| # | Couche | PR | État |
|---|--------|----|----|
| 1 | globals.css + layout + Header/Footer | #1 | ✅ |
| 2 | Page d'accueil 8 sections | #2 | ✅ |
| 3 | Catalogue ebooks + page de vente FedaPay | #3 | ✅ |
| — | Photo Hermann FounderBlock | #4 | ✅ |
| 4 | Blog Supabase + API d'injection IA | #5 | ✅ |
| 5 | Auth Supabase + dashboard membre | #6 | ✅ |
| 6 | Newsletter Supabase + Resend + Claude API (Brevo retiré) | #7 | ✅ |
| 7 | Paiement FedaPay + dashboard ebooks achetés | #8 | ✅ |
| — | Pré-fixes : nav `/#newsletter`, `/a-propos` Supabase, `metadata jsonb` partout | #9 | ✅ |
| 8 | Admin UI dark + CRUD + section Outils IA | #10 | ✅ |
| 9 | SEO sitemap + robots + JSON-LD | #11 | ✅ |
| 10 | Préparation déploiement VPS | #12 | ✅ |

---

## Routes du site

### Public
- `/` — accueil 8 sections
- `/ebooks` — catalogue
- `/ebooks/[slug]` — page de vente individuelle (FedaPay)
- `/blog` — liste avec filtres catégorie
- `/blog/[slug]` — article markdown + ToC + related + newsletter inline
- `/a-propos` — bio Hermann (contenu en table `pages` Supabase)
- `/merci` — retour paiement (lit `?ref=`)
- `/newsletter/confirmation` — page de confirmation après inscription

### Auth
- `/login`, `/register`, `/forgot-password`, `/reset-password`

### Membre (protégé via `proxy.ts`)
- `/dashboard` — vue d'ensemble
- `/dashboard/profil` — édition profil
- `/dashboard/mes-ebooks` — bibliothèque (purchases status='paid')
- `/dashboard/mes-commandes` — historique

### Admin (protégé `role='admin'`)
- `/admin` — dashboard CRM avec Recharts (revenue, membres, ventes, newsletter, sparklines, graphique revenue 12 mois, activité récente, widget campagnes)
- `/admin/ebooks` `/new` `/[id]` — CRUD avec cover preview, lead_magnet
- `/admin/articles` `/new` `/[id]` — CRUD avec badges source (manual/ai) et score coloré
- `/admin/membres` — liste profils avec avatar initiales + badges rôle/newsletter
- `/admin/membres/[id]` — fiche membre détaillée (profil + achats + emails campagne + promote/demote)
- `/admin/ventes` — historique purchases + total encaissé
- `/admin/ia` — placeholder 7 outils IA à venir
- `/admin/campagnes` — liste campagnes + stats (ouverture, clics)
- `/admin/campagnes/new` — création campagne
- `/admin/campagnes/[id]` — détail campagne + séquence emails + abonnés scorés + génération IA
- `/admin/popup` — configuration pop-up lead magnet + stats conversion
- `/admin/config` — configuration site_config (formulaire groupé par catégorie)

### API
- `POST /api/articles` (bearer `INTERNAL_API_TOKEN`) — injection IA d'articles
- `POST /api/newsletter/subscribe` — public, insère dans `newsletter_subscribers`
- `POST /api/newsletter/send` (bearer `INTERNAL_API_TOKEN`) — génère via Claude + envoie via SMTP
- `POST /api/newsletter/weekly` (bearer `INTERNAL_API_TOKEN`) — newsletter hebdo template statique via SMTP
- `POST /api/campaigns/generate-email` (bearer `INTERNAL_API_TOKEN`) — génère contenu email IA via Claude
- `POST /api/campaigns/process` (bearer `INTERNAL_API_TOKEN`) — processeur automatique campagnes actives
- `GET /api/track/open?id=SEND_ID` — pixel tracking ouverture email
- `GET /api/track/click?id=SEND_ID&url=URL` — redirect tracking clic email
- `POST /api/track` — tracking comportemental (page views + events), vérifie consent
- `GET /api/popup/config` — retourne config pop-up active (public)
- `POST /api/popup/send-lead-magnet` — envoie email lead magnet
- `POST /api/purchases/init` — pré-paiement FedaPay
- `POST /api/webhooks/fedapay` (HMAC-SHA256) — confirme paiement + email transactionnel
- `POST /api/auth/signout` — clear cookies sb-* + retour client

---

## Tables Supabase

| Table | Description |
|-------|-------------|
| `auth.users` | Géré automatiquement |
| `profiles` | id, email, full_name, country, phone, newsletter_opt, role (member/admin), metadata |
| `ebooks` | title, slug, description, price, fedapay_link, features jsonb, target_audience jsonb, is_published, is_featured, metadata |
| `articles` | title, slug, body markdown, excerpt, category, source (manual/ai), quality_score, featured, is_published, metadata |
| `purchases` | user_id (nullable), email, ebook_id, amount, payment_ref, status, payment_method, raw_payload jsonb, metadata |
| `pages` | slug, title, body markdown, cover, meta_description, metadata |
| `newsletter_subscribers` | email, first_name, source, tags jsonb, enrolled_campaign_id, campaign_step, last_email_sent_at, is_active, metadata |
| `campaigns` | name, type (welcome_sequence/promo/weekly/custom), status, target_tags jsonb, metadata |
| `campaign_emails` | campaign_id, position, subject, body_prompt, body_html, delay_days, metadata |
| `campaign_sends` | campaign_email_id, subscriber_email, status (pending/sent/opened/clicked/failed), sent_at, opened_at, clicked_at |
| `page_views` | session_id, user_id, path, referrer, user_agent, duration_seconds |
| `user_events` | session_id, user_id, event_type, metadata jsonb |
| `popup_config` | ebook_id, is_active, display_delay_seconds, scroll_threshold_percent, headline, cta_text, stats_shown, stats_submitted |
| `site_config` | key (unique), value, type (text/number/boolean/json/url/email), category, label, description, metadata, updated_by |

**Migrations** dans `supabase/migrations/` (à exécuter en ordre dans Supabase Dashboard SQL Editor) :
1. `001_ebooks.sql`
2. `002_articles.sql`
3. `003_profiles.sql`
4. `004_purchases.sql`
5. `005_pages.sql`
6. `006_metadata.sql` (ALTER TABLE ajoute `metadata jsonb` partout)
7. `007_last_visit.sql` (profiles.last_visit_at)
8. `008_fix_rls_recursion.sql` (drop policy récursive `profiles_admin_read`)
9. `009_newsletter_subscribers.sql` (table newsletter dédiée — remplace Brevo)
10. `010_campaigns.sql` (campaigns, campaign_emails, campaign_sends + extensions subscribers/ebooks)
11. `011_tracking.sql` (page_views, user_events)
12. `012_popup_config.sql` (popup_config)
13. `013_site_config.sql` (site_config — configuration dynamique du site)

---

## Variables d'environnement (`.env.local`)

Voir `.env.local.example`. Clés sensibles :
- `SUPABASE_SERVICE_ROLE_KEY` (admin)
- `INTERNAL_API_TOKEN` (bearer pour `/api/articles`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (SMTP Hostinger — fallback console.log si SMTP_HOST vide)
- `ANTHROPIC_API_KEY` (génération newsletter hebdo — no-op si vide)
- `FEDAPAY_API_KEY`, `FEDAPAY_WEBHOOK_SECRET`
- `ADMIN_SETUP_CODE` (bootstrap premier admin via `/admin-setup`)

---

## Déploiement Hostinger VPS

Voir [`DEPLOY.md`](./DEPLOY.md) pour le guide complet (Nginx, PM2, Cloudflare, migrations, granting admin).

Déploiement courant sur le VPS :
```bash
cd /var/www/hedjav-web
bash scripts/deploy.sh
```

Le script `scripts/deploy.sh` fait : `git pull → npm ci → npm run build → pm2 reload`.

`next.config.ts` est en `output: 'standalone'`, `ecosystem.config.js` configure PM2 cluster mode.

---

## QA visuelle

`scripts/shoot.mjs` (playwright) capture toutes les pages en desktop+mobile dans `.shots/` (gitignored).

```bash
node scripts/shoot.mjs
```

---

## Granter le rôle admin

Après inscription d'un user via `/register`, dans Supabase SQL Editor :
```sql
update profiles set role='admin' where email='<email>';
```
L'utilisateur peut alors accéder à `/admin`.

---

## Vision future (Phase 2 — pas encore codée)

L'architecture est prête pour :

### Automatisation contenu IA
- **Génération d'articles** : `POST /api/articles` avec `source='ai'` + `created_by='claude-sonnet-4-6'` → article visible immédiatement sans rebuild
- **Scoring qualité** : champ `quality_score` (0-100) déjà en base, à remplir via un endpoint `PATCH /api/articles/[id]/score`
- **Publication automatique** : scheduler (cron) qui publie les articles dont le score dépasse un seuil
- **Génération d'ebooks** via ghost-writer (skill Claude.ai)
- **Veille BRVM** : scraping + résumé quotidien
- **Génération de covers** SVG/PNG à partir du titre

Tout ça se branchera dans `/admin/ia` qui est déjà câblé avec 7 placeholder cards.

### Pages institutionnelles
- Toutes en table `pages` (CGV, mentions légales, politique de confidentialité)

### Monitoring
- Sentry, Vercel Analytics ou équivalent
- PM2 monit déjà disponible côté VPS

---

## Ce que Claude Code doit toujours faire

- Lire les fichiers existants AVANT de modifier
- Variables CSS hedjav uniquement (jamais de valeurs brutes)
- `.hedjav-container` jamais `.container`
- Branche `feature/nom` pour chaque feature
- Commits courts en français
- Ne jamais hardcoder du contenu — Supabase only
- Champ `metadata jsonb` exploitable sur toutes les nouvelles tables
- Toute nouvelle route API doit être pensée pour être appelable par un agent IA

---

## Skills Claude.ai disponibles (référence)
- `ghost-writer` — production d'ebooks complets en français UEMOA
- `hedjav-brvm-analyse` — analyses boursières BRVM (HTML hedjav, cartes WhatsApp, infographies)
- Création docs : `docx`, `pdf`, `pptx`, `xlsx`
- Frontend : `frontend-design`, `canvas-design`
- `theme-factory`, `brand-guidelines`, `mcp-builder`
