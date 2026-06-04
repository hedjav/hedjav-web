@AGENTS.md
# hedjav.com — Contexte projet pour Claude Code

## Positionnement
**hedjav.com — École en ligne de la Gestion de Patrimoine — Zone UEMOA**

Plateforme numérique centrale d'un écosystème intégrant ebooks, formations, analyses BRVM, club d'investissement, magazine HEDJAV Finance, SaaS MonPatrimoine, et future SGP. Cible : 174 M FCFA/an de revenus à maturité (Phase 4 — An 4).

Maître d'ouvrage : **Hermann D. AVAHOUIN** — analyste financier, 13 ans d'expérience BOA Bénin, fondateur KTALYZ Conseils, expert patrimoine UEMOA. Tous les textes publics mentionnent **13 ans**. Jamais mentionner LinkedIn (le compte n'existe pas).
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
| Paiement | **FedaPay** — flux serveur-side (SDK `fedapay`), pas de liens me.fedapay.com (Wave, Orange Money, MTN MoMo, carte) |
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
- Toutes les routes API (`/api/articles`, `/api/newsletter/subscribe`, `/api/purchases/create`, `/api/webhooks/fedapay`) sont conçues pour être appelables par un agent IA.
- L'admin UI (rasée le 03/06/2026, en reconstruction) prévoira une section `/admin/ia` pour les futurs outils IA.

### BRVM — règles IA (refonte 2026-04-15)

- **Prompts factorisés** dans `lib/brvm/ai/prompts/*.ts`. Jamais hardcoder un prompt BRVM dans une route — passer par la façade `generateBrvmContent(kind, options)` ou les helpers dédiés (`generateBrvmArticleDraft`, `generateBrvmEditorialSuggestions`, `scoreBrvmDocument`).
- **System prompt de base** (`lib/brvm/ai/prompts/_system.ts` → `BRVM_SYSTEM_BASE`) : un seul point à éditer pour faire évoluer tous les use cases. Les prompts spécifiques composent via `composeSystem(extra)`.
- **Contexte enrichi obligatoire** : utiliser `buildBrvmAiContext({ period, focus_* })` pour fournir univers/société/secteur/indice aux prompts. Ne jamais passer des docs bruts non enrichis.
- **Emails BRVM** : module `lib/email/brvm/` pour toute nouvelle communication BRVM admin. Ne plus étendre `brvmDocDigestEmail` legacy. Les 4 formats (digest daily/weekly/monthly + alerte instantanée) partagent les primitives (`FAMILY_PALETTE`, `docRow`, `aiBlock`, `kpiRow`, …) pour cohérence.
- **Dédup** : `getRecentlySentDocIds(frequency)` + persistance `document_ids` + `content_hash` dans `brvm_alert_log.metadata`. Pas de re-création de migration — la colonne jsonb existe.

### BRVM — règles durables (après refonte veille documentaire)
- **Le dossier `/hedjav-scrap/` (ou `/hedjav-scrapp/`) NE DOIT JAMAIS être committé.** Il fait 236 MB et est un miroir HTTrack local pour rétro-ingénierie. Les deux orthographes sont dans `.gitignore`.
- **Priorité des sources** (non négociable) : `brvm.org` > `bfin.brvm.org` > `sikafinance.com`. Toute nouvelle intégration doit respecter cet ordre.
- **Priorité métier** : le **BOC (Bulletin Officiel de la Cote)** passe avant tout. Les triggers PG et les KPIs admin le mettent en évidence (`priority='high'` pour les notifications BOC).
- **Stockage des documents BRVM** : par défaut **métadonnées uniquement** (`brvm_documents.title/doc_date/pdf_url/checksum`). Les PDFs ne sont téléchargés **qu'à la demande** via `POST /api/brvm/download` ou `scripts/download-brvm-pdfs.ts` (le hub `/admin/brvm` a été rasé avec l'ancien admin, à recréer), et uniquement dans le bucket privé Supabase Storage `brvm-documents`. Jamais en base en `bytea`.
- **IA via couche unifiée `lib/ai/client.ts`** — providers supportés : DeepSeek (prioritaire), OpenAI, Anthropic. Jamais de clé en dur, toujours `process.env`. Dégradation propre (`{ ok: false, skipped: true }`) si aucun provider. Les routes qui appellent l'IA doivent toujours avoir un fallback non-IA (voir `/api/brvm/alerts/digest`, `/api/newsletter/send`, `/api/campaigns/generate-email`).
- **Maintenance périodique obligatoire** : `GET /api/brvm/maintenance` doit être requêté au moins toutes les 30 min par un monitoring externe. Voir `docs/BRVM.md` § 10.
- **Rétro-ingénierie via miroir** : toute modification d'un scraper doit d'abord être testée contre le miroir HTTrack via `scripts/import-brvm-history.ts --dry-run`. Voir `docs/BRVM.md` §§ 8-9.

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
- Premier admin : créer un compte via `/register`, puis promouvoir via `node scripts/promote-admin.mjs <email>` ou SQL direct (`update profiles set role='admin' where email='...'`).
- Promouvoir/rétrograder : se faisait depuis `/admin/membres` (**admin rasé** — passer par SQL direct en attendant le nouvel admin ; règle à conserver : impossible de rétrograder le dernier admin).
- Le proxy `proxy.ts` protège `/admin` (admin role) et `/dashboard` (user connecté).

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
| 6 | Newsletter Supabase + SMTP Hostinger + Claude API (Brevo retiré) | #7 | ✅ |
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

### Admin — ⚠️ RASÉ (03/06/2026, commit 653842c)

**L'ancien back-office a été entièrement supprimé** (`app/(admin)/`, `app/api/admin/`, `components/admin/`, `lib/admin/` — 106 fichiers, ~15 600 lignes) pour être reconstruit à neuf. Les données Supabase, l'auth, le site public et le dashboard membre sont **intacts**. `proxy.ts` protège toujours `/admin` (prêt pour le nouvel admin). Les libs partagées (`lib/auth/session.ts` avec `requireAdmin`, `lib/*/queries.ts`) sont conservées pour le rebranchage.

**Cron à rebrancher** : l'annulation horaire des achats abandonnés passait par `/api/admin/purchases/cancel-stale` (supprimée) → utiliser `npx tsx scripts/cancel-stale-purchases.ts` en attendant.

La liste ci-dessous décrit l'**ancien admin** et sert de **spécification pour la reconstruction** :

- `/admin` — dashboard CRM avec Recharts (revenue, membres, ventes, newsletter, sparklines, graphique revenue 12 mois, activité récente, widget campagnes)
- `/admin/ebooks` `/new` `/[id]` — CRUD avec cover preview, lead_magnet
- `/admin/articles` `/new` `/[id]` — CRUD avec badges source (manual/ai) et score coloré
- `/admin/membres` — liste profils avec avatar initiales + badges rôle/newsletter
- `/admin/membres/[id]` — fiche membre détaillée (profil + achats + emails campagne + promote/demote)
- `/admin/ventes` — stat cards (CA total, CA mois, nb ventes) + tableau + export CSV
- `/admin/factures` — tableau factures avec recherche + lien PDF
- `/admin/pages` — liste pages légales (CGV, mentions, etc.)
- `/admin/pages/[slug]` — éditeur page (titre, body markdown, meta_description)
- `/admin/ia` — stats IA (appels, tokens, taux succes) + logs + generateur articles
- `/admin/mediatheque` — grille medias Supabase Storage + upload + copier URL + supprimer
- `/admin/campagnes` — liste campagnes + stats (ouverture, clics)
- `/admin/campagnes/new` — création campagne
- `/admin/campagnes/[id]` — détail campagne + séquence emails + abonnés scorés + génération IA
- `/admin/popup` — configuration pop-up lead magnet + stats conversion
- `/admin/config` — configuration site_config (formulaire groupé par catégorie)

### API
- `POST /api/articles` (bearer `INTERNAL_API_TOKEN`) — injection IA d'articles (legacy, toujours actif pour agents externes)
- ~~`POST /api/admin/articles/ai/{angles,titles,draft,score}`~~ — **supprimées avec l'admin rasé**, à recréer dans le nouvel admin (spec : angles/titres SEO/brouillon persisté draft/score 5 critères UEMOA)
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
- `GET /api/purchases/check?ebook_id=XXX` — vérifie si user a déjà acheté (401 si non connecté)
- `POST /api/purchases/create` — crée purchase pending + transaction FedaPay server-side
- `POST /api/webhooks/fedapay` (HMAC-SHA256) — confirme paiement + email + facture + notification
- `POST /api/invoices/generate` (bearer `INTERNAL_API_TOKEN`) — genere facture PDF pour un achat
- ~~`GET /api/admin/notifications`~~, ~~`POST /api/admin/notifications/read`~~, ~~`GET /api/admin/ventes/export`~~ — **supprimées avec l'admin rasé** (les tables `admin_notifications` et les libs `lib/notifications/queries.ts` restent en place)
- `POST /api/media/upload` (session admin) — upload fichier dans bucket media
- `DELETE /api/media/delete` (session admin) — supprime fichier du bucket media
- `POST /api/notifications/send-email` (bearer `INTERNAL_API_TOKEN`) — envoie par email les admin_notifications non envoyées (individuel ou digest)
- `POST /api/reports/monthly` (bearer `INTERNAL_API_TOKEN`) — calcule stats mois précédent + crée notification report
- `POST /api/auth/signout` — clear cookies sb-* + retour client

### BRVM — Veille documentaire (refonte)
- `POST /api/brvm/scrape` (bearer `INTERNAL_API_TOKEN`) — orchestrateur : market data + BOC + rapports + annonces en 1 appel
- `POST /api/brvm/scrape/boc` (bearer) — scraping BOC uniquement (priorité métier)
- `POST /api/brvm/scrape/rapports` (bearer) — rapports société cotée brvm.org
- `POST /api/brvm/scrape/annonces` (bearer) — toutes catégories annonces brvm.org
- `GET /api/brvm/documents` (session admin) — liste paginée avec filtres (doc_type, source, is_new, date, search)
- `POST /api/brvm/documents/[id]/process` (session admin) — marquer traité
- `POST /api/brvm/scrape/emetteurs` (bearer OU session admin) — seed + sync référentiel sociétés cotées (fallback `EMETTEURS_SEED`)
- `POST /api/brvm/scrape/marche` (bearer OU session admin) — résumé séance + cours actions + cours obligations + indices
- `POST /api/brvm/scrape/publications` (bearer OU session admin) — boucle sur 7 sous-catégories de publications
- `GET /api/brvm/emetteurs` / `/[slug]` / `/[slug]/documents` (session admin) — référentiel + détail + docs par société
- `GET /api/brvm/marche/{snapshots,ticks,indices}` (session admin) — séries temporelles marché
- `POST /api/brvm/alerts/digest` (bearer OU session admin) — digest email admin refondu (`lib/email/brvm/`) avec contexte IA enrichi (`lib/brvm/ai/`) + dédup 24h (daily) / 12h (manual). Body : `{ frequency, dry_run?, ai? }`. Journalise dans `brvm_alert_log` (migration 025).
- `POST /api/brvm/alerts/instant` (bearer OU session admin) — alerte instantanée 1-10 docs avec `importance`, dédup 12h
- ~~`POST /api/admin/brvm-trigger`~~ — **supprimée avec l'admin rasé** (appeler `/api/brvm/scrape` en bearer directement)

### BRVM — Couche IA d'exploitation (`lib/brvm/ai/`)
- `POST /api/brvm/ai/digest` (bearer OU session admin) — 4 use cases : admin_alert / daily_digest / weekly_digest / monthly_digest
- `POST /api/brvm/ai/article-draft` (bearer OU session admin) — brouillon JSON `{title, excerpt, category, body}`
- `POST /api/brvm/ai/suggestions` (bearer OU session admin) — 5-8 idées d'articles avec priorité et univers
- `POST /api/brvm/ai/score` (bearer OU session admin) — qualification noise/useful/important/priority, persistance `brvm_documents.metadata.ai_score`, fallback heuristique
- `POST /api/brvm/download` (session admin OU bearer) — télécharge les PDFs d'une période dans le bucket privé `brvm-documents` ; dédup via `metadata.storage_path`. Voir `docs/BRVM.md` § 5
- `GET /api/brvm/download?document_id=XXX` (session admin) — signed URL 5 min vers un PDF archivé
- `GET /api/brvm/maintenance` (session admin OU bearer) — rapport de santé complet (tables, sources, documents, anomalies, recommandations). Voir `docs/BRVM.md` § 10
- **Supprimées** : `/api/brvm/daily` → `/api/brvm/scrape`. `/api/brvm/reports-scan` → `/api/brvm/scrape/rapports`. `/api/brvm/summarize` → `/api/brvm/ai/digest`. `/api/brvm/weekly-digest` → `/api/brvm/ai/article-draft`.

### Ebooks — Livraison (hotfix)
- `GET /api/ebooks/download?ebook_id=XXX` (session user) — signed URL 5 min après vérification purchase paid
- ~~`POST /api/admin/ebooks/upload-file`~~ — **supprimée avec l'admin rasé**, à recréer (upload PDF/ePub/ZIP dans bucket privé `ebook-files`)

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
| `invoices` | invoice_number (unique), purchase_id, user_id, user_email, user_name, ebook_title, amount, currency, status, company_*, pdf_url, metadata |
| `admin_notifications` | type, title, message, is_read, metadata, priority, email_sent |
| `ai_logs` | action, prompt, result, model, tokens_used, duration_ms, status, error_message, created_by, metadata |
| `brvm_data` | Données marché (cours, indices, résumé séance) — legacy, stocke JSON par data_date+data_type |
| `brvm_sources` | slug (brvm-org/bfin/sikafinance), name, base_url, priority, last_scraped_at, last_success_at, last_error |
| `brvm_documents` | **Veille documentaire** : source_id, doc_type, title, doc_date, source_url, pdf_url, issuer_*, checksum UNIQUE, is_new, is_processed, metadata |

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
14. `014_invoices.sql` (invoices + generate_invoice_number function)
15. `015_notifications.sql` (admin_notifications)
16. `016_ai_logs.sql` (ai_logs)
17. `017_megafix.sql` (admin_notifications: email_sent, email_sent_at, priority + fonction notify_admin)
18. `018_corrections_textes.sql` (corrections site_config)
19. `019_brvm_data.sql` (brvm_data — données marché BRVM)
20. `020_brvm_refactor.sql` (**brvm_sources + brvm_documents** — veille documentaire avec checksum, priorité source, trigger notification sur nouveau doc. Contient un filet qui crée brvm_data si 019 n'a jamais été appliquée.)
21. `021_ebook_files.sql` (ebooks.file_path + bucket privé `ebook-files` + RLS admin upload/delete — fix livraison post-paiement FedaPay)
22. `023_brvm_clean_reset.sql` (reset propre des tables brvm_sources + brvm_documents avec check contraints, indexes et trigger notification — base actuelle)
23. `024_content_exploitation.sql` (articles enrichis + contenu homepage premium + première campagne bienvenue)
24. `025_brvm_alerts.sql` (table `brvm_alert_log` + colonnes `sector` / `market_index` sur brvm_documents + RLS admin — additif)
25. `026_iceberg_audit.sql` (audit iceberg : `admin_notifications.target_url/entity_type/entity_id` + `ai_logs` status étendu + `admin_settings.brvm_alert_frequencies`)
26. `027_brvm_emetteurs.sql` (**référentiel sociétés cotées** — slug, ticker, ISIN, country, sector, market, indices[], aliases[], is_active, RLS admin)
27. `028_brvm_doc_taxonomy.sql` (**doc_family + doc_subtype + emetteur_id FK** sur brvm_documents, backfill depuis doc_type, indexes combinés)
28. `029_brvm_market_timeseries.sql` (**séries temporelles marché** : brvm_market_snapshots + brvm_market_ticks + brvm_indices_ticks, upsert idempotent, RLS admin)
29. `030_articles_workflow.sql` (**workflow éditorial articles** : enum `article_status` draft/review/published/archived, backfill depuis is_published, trigger de synchro, indexes pour listes admin/blog)
30. `031_articles_expert_prompt.sql` (**prompt expert optionnel** : seed de la clé `articles_expert_prompt` dans site_config, category=ia, injectée en 3ème couche du system prompt IA articles sans redéploiement)

---

## Variables d'environnement (`.env.local`)

Voir `.env.local.example`. Clés sensibles :
- `SUPABASE_SERVICE_ROLE_KEY` (admin)
- `INTERNAL_API_TOKEN` (bearer pour `/api/articles`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (SMTP Hostinger — fallback console.log si SMTP_HOST vide)
- `ANTHROPIC_API_KEY` (génération newsletter hebdo — no-op si vide)
- `FEDAPAY_API_KEY`, `FEDAPAY_WEBHOOK_SECRET`
- `ADMIN_SETUP_CODE` (legacy — plus utilisé, le bootstrap admin se fait via script ou SQL)

---

## Déploiement Hostinger VPS

Voir [`docs/DEPLOY.md`](./docs/DEPLOY.md) pour le guide complet (Hostinger, Supabase, FedaPay, SMTP, cron).

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
- **Centre de Veille BRVM** : hub unifié (scraping + filtre + archivage + alertes email) — voir [`docs/BRVM.md`](./docs/BRVM.md) pour tout le module (tables, UI, routes API, alertes email multi-fréquence, scripts)
- **Génération de covers** SVG/PNG à partir du titre

Tout ça se branchera dans `/admin/ia` du **nouvel admin** (l'ancien, qui avait 7 placeholder cards, a été rasé).

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
