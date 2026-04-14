# hedjav-web — Rapport d'architecture complet

> Généré le 2026-04-14 par Claude Opus 4.6  
> Projet : **hedjav.com — École en ligne de la Gestion de Patrimoine — Zone UEMOA**  
> Repo : `hedjav/hedjav-web`  
> Stack : Next.js 16 + Supabase + TypeScript + Tailwind CSS v4  

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Fichiers de configuration racine](#2-fichiers-de-configuration-racine)
3. [Système de design (globals.css)](#3-système-de-design-globalscss)
4. [Couche données — lib/](#4-couche-données--lib)
5. [Composants — components/](#5-composants--components)
6. [Pages — app/](#6-pages--app)
7. [Routes API — app/api/](#7-routes-api--appapi)
8. [Scripts utilitaires — scripts/](#8-scripts-utilitaires--scripts)
9. [Migrations SQL — supabase/migrations/](#9-migrations-sql--supabasemigrations)
10. [Schéma des tables Supabase](#10-schéma-des-tables-supabase)
11. [Flux de données critiques](#11-flux-de-données-critiques)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Déploiement](#13-déploiement)

---

## 1. Vue d'ensemble

### Architecture globale

```
┌──────────────────────────────────────────────────────────┐
│                     NAVIGATEUR                           │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Public   │  │ Auth     │  │Dashboard │  │ Admin    │ │
│  │ (SSR)    │  │ (Client) │  │ (SSR)    │  │ (SSR)    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼──────────────┼──────────────┼──────────────┼──────┘
        │              │              │              │
┌───────┴──────────────┴──────────────┴──────────────┴──────┐
│                    NEXT.JS 16 SERVER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ proxy.ts │  │ API      │  │ Server   │  │ Server   │  │
│  │(middleware│  │ Routes   │  │ Actions  │  │Components│  │
│  │  Edge)   │  │ (48)     │  │ (auth/   │  │ (SSR)    │  │
│  └────┬─────┘  └────┬─────┘  │  admin)  │  └────┬─────┘  │
│       │              │        └────┬─────┘       │        │
│  ┌────┴──────────────┴─────────────┴─────────────┴─────┐  │
│  │                    lib/ (41 fichiers)                │  │
│  │  supabase/ │ auth/ │ admin/ │ brvm/ │ email/ │ ...  │  │
│  └──────────────────────┬──────────────────────────────┘  │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────┴─────────────────────────────────┐
│                      SUPABASE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │   RLS    │  │
│  │(17 tables│  │(sessions)│  │(buckets) │  │(policies)│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────────────────┘
          │                    │                │
    ┌─────┴─────┐        ┌────┴────┐     ┌─────┴─────┐
    │  FedaPay  │        │  SMTP   │     │Claude API │
    │ (paiement)│        │Hostinger│     │(contenu)  │
    └───────────┘        └─────────┘     └───────────┘
```

### Chiffres clés du projet

| Métrique | Valeur |
|----------|--------|
| Fichiers source (.ts/.tsx/.css/.sql) | ~170 |
| Routes API | 48 |
| Tables Supabase | 17 |
| Migrations SQL | 22 |
| Composants React | 50+ |
| Pages (toutes sections) | 50+ |
| Scripts CLI | 12 |
| Modules lib/ | 19 (41 fichiers) |

---

## 2. Fichiers de configuration racine

### `package.json`

**Rôle** : Manifeste du projet, dépendances, scripts de build.

**Scripts** :
- `dev` → `next dev` (serveur de dev avec Turbopack)
- `build` → `next build` (build production standalone)
- `start` → `next start` (serveur de production)
- `lint` → ESLint avec règles Next.js

**Dépendances de production** :

| Package | Version | Rôle |
|---------|---------|------|
| next | 16.2.2 | Framework React SSR/SSG |
| react / react-dom | 19.2.4 | Moteur UI (Server Components, Concurrent) |
| @supabase/ssr | ^0.10.0 | Client Supabase côté serveur (cookies) |
| @supabase/supabase-js | ^2.102.1 | SDK Supabase (DB, Auth, Storage) |
| cheerio | ^1.2.0 | Parsing HTML côté serveur (scraping BRVM) |
| fedapay | ^1.2.5 | SDK paiement FedaPay (Wave, Orange Money, MTN) |
| jspdf | ^4.2.1 | Génération PDF (factures) |
| nodemailer | ^8.0.5 | Envoi email SMTP Hostinger |
| next-themes | ^0.4.6 | Thème clair/sombre |
| react-markdown | ^10.1.0 | Rendu Markdown → React |
| recharts | ^3.8.1 | Graphiques admin (revenue, sparklines) |
| rehype-sanitize | ^6.0.0 | Sécurisation HTML (anti-XSS) |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown (tables, etc.) |
| xlsx | ^0.18.5 | Export/import Excel |

**Dépendances de développement** :

| Package | Rôle |
|---------|------|
| @tailwindcss/postcss ^4 | Moteur Tailwind CSS v4 |
| typescript ^5 | Compilateur TypeScript |
| eslint ^9 + eslint-config-next | Linting + Core Web Vitals |
| playwright ^1.49 | Screenshots automatiques (QA) |
| @types/* | Types TypeScript (Node, React, Nodemailer) |

---

### `next.config.ts`

**Rôle** : Configuration build et runtime Next.js.

**Paramètres clés** :

- `output: 'standalone'` → Bundle autonome pour VPS (pas besoin de node_modules en prod)
- **Images** : Autorise uniquement `*.supabase.co` (whitelist)
- **Headers de sécurité** (appliqués à toutes les routes) :

| Header | Valeur | Protection |
|--------|--------|------------|
| X-Frame-Options | DENY | Anti-clickjacking |
| X-Content-Type-Options | nosniff | Anti-MIME sniffing |
| HSTS | max-age=63072000; includeSubDomains | Force HTTPS 2 ans |
| Referrer-Policy | strict-origin-when-cross-origin | Contrôle referrer |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Bloque capteurs |
| CSP | default-src 'self'; connect-src Supabase/FedaPay/Anthropic; frame-src FedaPay | Politique de contenu |

---

### `proxy.ts` (middleware Edge)

**Rôle** : Intercepte TOUTES les requêtes pour protéger les routes authentifiées.

**Flux d'authentification** :

```
Requête HTTP
    │
    ├─ /dashboard/* → User connecté ? ✓ passe │ ✗ redirect /login?next=...
    │
    ├─ /admin/*     → User admin ?    ✓ passe │ ✗ redirect /
    │
    ├─ /login, /register → User connecté ? ✓ redirect /dashboard │ ✗ passe
    │
    └─ Autre route  → Passe sans vérification
```

**Détails techniques** :
- Crée un client Supabase SSR avec gestion cookies (getAll/setAll)
- Appelle `supabase.auth.getUser()` pour récupérer la session
- Pour /admin : requête supplémentaire `profiles.role` via service_role
- Erreurs réseau → laisse passer (graceful degradation pendant outage Supabase)
- Matcher : exclut `_next/static`, `_next/image`, favicon, images statiques

---

### `app/layout.tsx` (Layout racine)

**Rôle** : Enveloppe TOUTE l'application. Métadonnées SEO, fonts, thème.

**Metadata** :
- `title.default` : "Hedjav — École en ligne de la Gestion de Patrimoine · Zone UEMOA"
- `title.template` : "%s · Hedjav" (chaque page ajoute son titre)
- `locale` : fr_FR
- `metadataBase` : `https://egp.hedjav.com`
- Open Graph configuré (type, locale, siteName)

**Polices** (via `next/font/google`, pas d'@import) :

| Variable CSS | Police | Usage |
|-------------|--------|-------|
| `--fd` | Cormorant Garamond | Titres, hero, logo |
| `--fb` | DM Sans | Corps, navigation, UI |
| `--fm` | DM Mono | Prix FCFA, données BRVM |

**Structure HTML** :
```html
<html lang="fr" suppressHydrationWarning>
  <body className="min-h-screen flex flex-col">
    <ThemeProvider attribute="data-theme" defaultTheme="light">
      {children}
    </ThemeProvider>
  </body>
</html>
```

---

### `tsconfig.json`

- `target: ES2017`, `module: esnext`, `strict: true`
- `moduleResolution: bundler` (natif Next.js)
- Path alias : `@/*` → racine projet
- `noEmit: true` (Next.js gère la compilation)
- Plugin Next.js pour types spécifiques

### `postcss.config.mjs`

- Plugin unique : `@tailwindcss/postcss` (Tailwind v4 natif)

### `eslint.config.mjs`

- Règles `next/core-web-vitals` + `next/typescript`
- Ignore `.next/`, `out/`, `build/`

### `ecosystem.config.js` (PM2)

```javascript
{
  name: 'hedjav',
  script: 'node_modules/next/dist/bin/next',
  args: 'start --port 3000',
  cwd: '/var/www/hedjav-web',
  instances: 'max',          // Tous les CPU
  exec_mode: 'cluster',      // Multi-process
  max_memory_restart: '500M',
  autorestart: true
}
```

### `app/robots.ts`

Bloque les crawlers sur : `/admin`, `/dashboard`, `/api`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/merci`, `/newsletter/confirmation`. Référence le sitemap.

### `app/sitemap.ts`

- Revalidation ISR toutes les heures
- URLs statiques : `/` (priorité 1.0), `/ebooks` (0.9), `/blog` (0.9), `/a-propos` (0.6)
- URLs dynamiques : ebooks publiés (0.8), articles publiés (0.7)
- Requêtes Supabase en `Promise.all()` pour performance

---

## 3. Système de design (globals.css)

**Fichier** : `app/globals.css` (~846 lignes)

### Tokens de couleur

```css
/* Palette Navy (primaire) */
--n975: #080D18    /* Le plus sombre */
--n950: #0D1628    /* Admin, sidebar, footer */
--n900: #1B2A4A    /* Navy principal */
--n800: #243660
--n700: #2F4577
--n500: #4A6BA0
--n200: #B8CADF
--n50:  #F0F4F8    /* Le plus clair */

/* Palette Or (accent) */
--g900: #6B5400
--g700: #9A7B00
--g500: #C5A028    /* Or principal — CTA, badges */
--g300: #E8CC5C
--g100: #F8F0C8
--g50:  #FCF8E8

/* Sémantique */
--ok:    #1E7A34   /* Succès */
--err:   #B91C1C   /* Erreur */
--warn:  #B45309   /* Avertissement */
--info:  #1D4ED8   /* Information */

/* Surfaces */
--cream: #F8F5EE   /* Fond de page */
--white: #FFFFFF   /* Fond cartes */
```

### Mode sombre (`[data-theme="dark"]`)

Les couleurs de marque (navy, or) restent identiques. Seuls les tokens sémantiques s'inversent :
- `--bg` : #0A1220
- `--surface` : #131F36
- `--text` : #F0F3F8
- Or rehaussé à #ECCC60 pour contraste

### Composants CSS

| Classe | Description |
|--------|-------------|
| `.btn-primary` | Bouton navy, texte blanc, ombre |
| `.btn-gold` | Bouton or, texte blanc, lueur dorée |
| `.btn-outline` | Transparent, bordure navy |
| `.btn-ghost` | Transparent, bordure grise |
| `.card` | Fond blanc, ombre, hover avec élévation |
| `.badge-*` | Pills colorés (navy, gold, success, danger, warning) |
| `.input` | Champ avec focus navy, erreur rouge |
| `.hedjav-container` | Max 1200px, centré, padding latéral |
| `.section` | Padding vertical 80px |
| `.h1, .h2, .h3` | Titres Cormorant Garamond |
| `.eyebrow` | Label uppercase avec letter-spacing |
| `.price` | DM Mono pour prix FCFA |
| `.hedjav-grid-3` | Grille responsive 1/2/3 colonnes |
| `.hedjav-dash-*` | Styles dashboard membre |
| `[data-admin]` | Palette sombre indépendante pour admin |

### Accessibilité

- `.skip-nav:focus` → lien "Passer au contenu" visible au focus
- `:focus-visible` → outline or 2px global
- Contrastes WCAG vérifiés (or sur navy)

---

## 4. Couche données — lib/

### Vue d'ensemble (19 modules, 41 fichiers)

```
lib/
├── supabase/          # Clients Supabase (browser + server) + types
│   ├── client.ts      # Client navigateur
│   ├── server.ts      # Client serveur (cookies)
│   └── types.ts       # 16 interfaces TypeScript
├── auth/              # Authentification + session
│   ├── actions.ts     # Server Actions (signup, login, logout, profil)
│   ├── session.ts     # Helpers getCurrentUser/requireAdmin
│   └── countries.ts   # Liste pays UEMOA
├── admin/             # CRUD admin
│   ├── actions.ts     # Ebooks/articles CRUD
│   ├── campaign-actions.ts  # Campagnes email
│   └── setup.ts       # Bootstrap admin
├── brvm/              # Veille BRVM (11 fichiers)
│   ├── types.ts       # Enums DocType, SourceSlug + interfaces
│   ├── auth.ts        # Vérification token/session API
│   ├── checksum.ts    # SHA256 pour déduplication
│   ├── http.ts        # Fetch avec contournement SSL brvm.org
│   ├── documents.ts   # CRUD documents BRVM
│   ├── sources.ts     # Gestion sources (brvm-org, bfin, sikafinance)
│   ├── scraper.ts     # Scraping sikafinance (cours, indices)
│   ├── scrapers/brvm-org.ts  # Scraping brvm.org (BOC, rapports, annonces)
│   ├── pdf-downloader.ts     # Téléchargement PDFs → Storage
│   ├── maintenance.ts        # Rapports de santé
│   ├── article-generator.ts  # Génération articles via Claude
│   └── run-full-scrape.ts    # Orchestrateur scraping complet
├── ai/                # Journalisation IA
│   └── log.ts         # Log appels Claude (tokens, durée, erreurs)
├── articles/          # Requêtes articles (lecture publique)
│   └── queries.ts
├── campaigns/         # Requêtes campagnes email
│   └── queries.ts
├── claude/            # Client Claude API
│   └── client.ts      # generateText() → Anthropic Messages API
├── config/            # Configuration dynamique
│   ├── homepage.ts    # Config homepage depuis site_config
│   └── queries.ts     # CRUD site_config
├── dashboard/         # Helpers dashboard membre
│   └── queries.ts
├── ebooks/            # Requêtes ebooks (lecture publique)
│   └── queries.ts
├── email/             # Système email
│   ├── smtp.ts        # Transport SMTP Hostinger (nodemailer)
│   └── templates.ts   # 8 templates HTML inline-styled
├── fedapay/           # Paiement
│   └── verify.ts      # Vérification HMAC-SHA256 webhook
├── invoices/          # Facturation
│   ├── generate-pdf.ts  # Génération PDF (jsPDF)
│   └── queries.ts       # CRUD + workflow facture
├── notifications/     # Notifications admin
│   └── queries.ts
├── pages/             # Pages institutionnelles
│   └── queries.ts
├── popup/             # Pop-up lead magnet
│   └── queries.ts
├── purchases/         # Achats utilisateur
│   └── queries.ts
└── utils/             # Utilitaires
    ├── rate-limit.ts  # Rate limiting en mémoire
    └── validation.ts  # Email/mot de passe/téléphone UEMOA
```

### Détail des modules critiques

#### `lib/supabase/` — Clients Supabase

**client.ts** : Crée un client navigateur via `createBrowserClient()`. Utilise les variables publiques `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**server.ts** : Crée un client serveur via `createServerClient()` avec gestion automatique des cookies (getAll/setAll). Utilisé par toutes les pages SSR et routes API.

**types.ts** : 16 interfaces TypeScript pour toutes les tables :
- `Profile`, `Ebook`, `Article`, `Purchase`, `Invoice`
- `NewsletterSubscriber`, `Campaign`, `CampaignEmail`, `CampaignSend`
- `PageView`, `UserEvent`, `SiteConfig`, `PopupConfig`
- `AdminNotification`, `BrvmData`, `AiLog`

#### `lib/auth/` — Authentification

**actions.ts** (Server Actions) :
- `signUpAction(formData)` → Inscription + email bienvenue + notification admin
- `signInAction(formData)` → Login avec validation redirect anti-open-redirect
- `signOutAction()` → Déconnexion + redirect
- `requestPasswordResetAction()` → Email de reset
- `updatePasswordAction()` → Changement mot de passe (validation : 8+ chars, 1 maj, 1 chiffre)
- `updateProfileAction()` → Mise à jour profil (upsert pour compatibilité)

**session.ts** :
- `getCurrentUser()` → User Supabase ou null
- `getCurrentProfile()` → Profil complet (avec rôle)
- `requireUser()` → Redirect /login si non connecté
- `requireAdmin()` → Redirect / si non admin

**countries.ts** : 9 pays UEMOA (BJ, CI, SN, BF, ML, NE, TG, GW, OTHER)

#### `lib/brvm/` — Veille documentaire BRVM (11 fichiers)

Le sous-système BRVM est le plus complexe du projet. Il surveille la Bourse Régionale des Valeurs Mobilières (zone UEMOA) en scrapant 3 sources web.

**Hiérarchie des sources** (non négociable) :
1. `brvm.org` (priorité 10) — officiel, BOC prioritaire
2. `bfin.brvm.org` (priorité 20) — back-office
3. `sikafinance.com` (priorité 30) — fallback

**Pipeline de scraping** (`run-full-scrape.ts`) :
```
1. Cours actions + indices → brvm_data
2. BOC (3 pages) → brvm_documents (checksum dedup)
3. Rapports sociétés → brvm_documents
4. Annonces (8 catégories) → brvm_documents
5. Notification admin avec compteurs agrégés
```

**Sécurité SSL** (`http.ts`) : brvm.org a une chaîne de certificats incomplète. Le module utilise un Agent undici avec `rejectUnauthorized: false` **uniquement pour les hôtes brvm.org**. Jamais appliqué globalement.

**Déduplication** (`checksum.ts`) : SHA256 de `source_slug | pdf_url/source_url | titre_normalisé`. Permet des scrapes idempotents (même doc 2x = même hash).

**Téléchargement PDFs** (`pdf-downloader.ts`) : Stocke dans le bucket privé `brvm-documents` avec chemin `{doc_type}/{YYYY}/{YYYY-MM-DD}_{checksum8}.pdf`. Séquentiel (pas de parallélisme) pour ne pas surcharger brvm.org.

#### `lib/claude/` — Client Claude API

**client.ts** : Wrapper minimal autour de l'API Anthropic Messages.

```typescript
generateText({
  prompt: string,
  system?: string,
  model?: string,       // Défaut : claude-sonnet-4-6
  maxTokens?: number    // Défaut : 2048
}) → { ok: true, text } | { ok: false, error, skipped? }
```

Mode dev : si `ANTHROPIC_API_KEY` absent, retourne `{ ok: false, skipped: true }` sans crash.

#### `lib/email/` — Système email

**smtp.ts** : Transport nodemailer via SMTP Hostinger. Fallback console.log si `SMTP_HOST` absent.

**templates.ts** : 8 templates HTML inline-styled (pas de CSS externe, compatibilité clients email) :
1. `welcomeEmail()` — Bienvenue post-inscription
2. `purchaseConfirmationEmail()` — Confirmation achat
3. `newsletterWeeklyEmail()` — Digest hebdo
4. `leadMagnetEmail()` — Livraison lead magnet
5. `notificationEmailTemplate()` — Alertes admin
6. `brvmDailyEmail()` — Surveillance marché quotidienne
7. `brvmWeeklyEmail()` — Synthèse hebdo marché
8. `newsletterSubscribedEmail()` — Confirmation inscription

#### `lib/fedapay/` — Paiement

**verify.ts** : Vérification signature HMAC-SHA256 des webhooks FedaPay. Supporte 4 formats de signature. Utilise `crypto.timingSafeEqual` pour comparaison constante (anti-timing attack).

#### `lib/utils/` — Utilitaires

**rate-limit.ts** : Rate limiting en mémoire (Map) avec nettoyage auto. Exemple : 5 requêtes/minute par IP.

**validation.ts** :
- `normalizeEmail()` → Gère les alias Gmail (dots, +tags), Outlook, Yahoo
- `validatePassword()` → Score 0-3 avec exigences (8 chars, 1 maj, 1 chiffre)
- `validatePhone()` → Validation UEMOA (indicatifs 229, 226, 225, 223, 221, 228, 227, 245)

---

## 5. Composants — components/

### Structure

```
components/
├── layout/          # Structure de page
│   ├── Header.tsx   # Navigation principale (Server Component)
│   ├── Footer.tsx   # Pied de page (Server Component)
│   ├── MobileNav.tsx  # Menu mobile (Client Component)
│   ├── nav-links.ts   # Données navigation
│   └── ThemeToggle.tsx  # Bascule thème (Client Component)
├── providers/
│   └── ThemeProvider.tsx  # Context next-themes
├── home/            # Sections page d'accueil
│   ├── Hero.tsx     # Héro avec CTA
│   ├── Pillars.tsx  # 3 piliers (Apprendre, Investir, Transmettre)
│   ├── EbooksTeaser.tsx   # 3 ebooks vedettes
│   ├── BlogTeaser.tsx     # 3 articles vedettes
│   ├── NewsletterCTA.tsx  # Section inscription newsletter
│   ├── NewsletterForm.tsx # Formulaire email (Client)
│   ├── FounderBlock.tsx   # Bio fondateur avec photo
│   ├── FinalCTA.tsx       # CTA final avant footer
│   └── TrustStrip.tsx     # Badges de confiance
├── features/        # Composants métier réutilisables
│   ├── AdminArticleForm.tsx   # Formulaire CRUD article
│   ├── AdminEbookForm.tsx     # Formulaire CRUD ebook
│   ├── ArticleBody.tsx        # Rendu markdown sécurisé
│   ├── ArticleCard.tsx        # Carte article (blog)
│   ├── BuyButton.tsx          # Bouton achat FedaPay
│   ├── CookieBanner.tsx       # Bandeau RGPD cookies
│   ├── EbookCard.tsx          # Carte ebook (catalogue)
│   ├── EbookFileUploader.tsx  # Upload PDF/ePub admin
│   ├── EbookPriceBlock.tsx    # Affichage prix FCFA
│   ├── EpargneSimulator.tsx   # Simulateur épargne composée
│   ├── JsonLd.tsx             # Données structurées SEO
│   ├── LeadMagnetPopup.tsx    # Pop-up capture email
│   ├── LocatifSimulator.tsx   # Simulateur rendement locatif
│   ├── LoginForm.tsx          # Formulaire connexion
│   ├── RegisterForm.tsx       # Formulaire inscription
│   ├── TrackingScript.tsx     # Analytics (consent-aware)
│   ├── UserMenu.tsx           # Menu utilisateur header
│   └── ... (12 autres)
└── admin/           # Composants panel admin
    ├── AdminHeader.tsx      # Barre supérieure admin
    ├── AdminSidebar.tsx     # Navigation latérale
    ├── AdminNotifications.tsx # Centre de notifications
    ├── DataTable.tsx        # Table générique triable/searchable
    ├── RevenueChart.tsx     # Graphique revenu (Recharts)
    ├── SparklineChart.tsx   # Mini graphique inline
    ├── CountryChart.tsx     # Camembert pays (Recharts)
    ├── TopEbooksWidget.tsx  # Classement ventes
    └── MediaPicker.tsx      # Sélecteur image + upload
```

### Composants clés détaillés

#### `BuyButton.tsx` (Client Component)

Machine à états pour le flux d'achat :

```
loading → guest (non connecté → lien login)
       → purchased (déjà acheté → lien dashboard)
       → ready (bouton achat actif)
       → purchasing (redirection FedaPay)
       → error (message d'erreur)
```

Appels API :
- `GET /api/purchases/check?ebook_id=` → Vérifie statut achat
- `POST /api/purchases/create` → Crée transaction FedaPay

#### `LeadMagnetPopup.tsx` (Client Component)

Pop-up de capture email avec déclencheurs configurables :
- Délai temporel (`display_delay_seconds`)
- Seuil de scroll (`scroll_threshold_percent`)
- Cookies de suppression (365 jours si soumis, session si fermé)
- Consent tracking vérifié avant envoi événements
- Formulaire : prénom (optionnel), email (requis), téléphone (optionnel)

#### `EpargneSimulator.tsx` (Client Component)

Calculateur d'intérêts composés avec :
- Sliders : capital initial, versement mensuel, taux annuel, durée
- Graphique SVG (area chart) : dépôts vs total avec intérêts
- Résultats : capital final, dépôts totaux, intérêts gagnés
- 100% client-side (pas d'API)

#### `TrackingScript.tsx` (Client Component)

Analytics maison respectant le consentement :
- Vérifie le cookie `hedjav_consent` avant tout tracking
- Track les vues de page (path, referrer, user_agent)
- Track la durée de visite toutes les 30 secondes
- Track les clics bouton achat via event delegation
- Écoute les changements de consentement (`hedjav:consent` event)
- Session ID dans sessionStorage

#### `DataTable.tsx` (Client Component — Admin)

Table générique avec :
- Tri par colonnes (click header → asc/desc)
- Recherche full-text multi-champs (supports objets imbriqués)
- Pagination (prev/next)
- Colonnes avec rendu custom (render functions)

---

## 6. Pages — app/

### Architecture de routage (Route Groups)

```
app/
├── (public)/        # Pages publiques (Header + Footer)
│   ├── page.tsx     # / — Accueil 8 sections
│   ├── [slug]/      # /cgv, /mentions-legales, etc.
│   ├── a-propos/    # /a-propos
│   ├── blog/        # /blog + /blog/[slug]
│   ├── ebooks/      # /ebooks + /ebooks/[slug]
│   ├── merci/       # /merci (post-paiement)
│   └── newsletter/  # /newsletter/confirmation
├── (auth)/          # Pages auth (layout centré)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── (dashboard)/     # Espace membre (protégé par proxy.ts)
│   ├── dashboard/
│   │   ├── page.tsx       # Vue d'ensemble
│   │   ├── mes-ebooks/    # Bibliothèque achetée
│   │   ├── mes-commandes/ # Historique (placeholder)
│   │   ├── outils/        # Simulateurs financiers
│   │   ├── alertes/       # Nouveautés 30 jours
│   │   └── profil/        # Édition profil
└── (admin)/         # Panel admin (protégé admin role)
    └── admin/
        ├── page.tsx       # Dashboard CRM
        ├── ebooks/        # CRUD ebooks
        ├── articles/      # CRUD articles
        ├── membres/       # Gestion membres
        ├── clients/       # Vue clients
        ├── campagnes/     # Campagnes email
        ├── newsletter/    # Abonnés newsletter
        ├── ventes/        # Statistiques ventes
        ├── factures/      # Factures PDF
        ├── mediatheque/   # Gestionnaire médias
        ├── ia/            # Outils IA + logs
        ├── brvm/          # Veille BRVM
        ├── popup/         # Config pop-up lead magnet
        ├── config/        # Configuration site
        ├── pages/         # Pages légales
        └── notifications/ # Notifications admin
```

### Pages publiques

| Route | Data Fetching | Contenu |
|-------|--------------|---------|
| `/` | SSR + `getHomepageConfig()` | Hero, piliers, ebooks, blog, newsletter, fondateur, CTA |
| `/ebooks` | ISR 60s | Catalogue ebooks avec grille 3 colonnes |
| `/ebooks/[slug]` | ISR 60s | Page de vente : image, prix, features, BuyButton, JSON-LD |
| `/blog` | ISR 60s | Articles avec filtres catégorie (`?cat=`) |
| `/blog/[slug]` | ISR 60s | Article complet : markdown, ToC, related, newsletter inline |
| `/a-propos` | SSR + fallback hardcodé | Bio fondateur, mission, contexte UEMOA |
| `/[slug]` | ISR 300s | Pages dynamiques (CGV, mentions légales, etc.) |
| `/merci` | SSR | Confirmation paiement (paid/pending/failed) + auto-refresh |

### Pages dashboard membre

| Route | Contenu |
|-------|---------|
| `/dashboard` | Stats (ebooks, profil %, badge, ancienneté), bibliothèque, outils, activité |
| `/dashboard/mes-ebooks` | Ebooks achetés + téléchargement + facture + pending |
| `/dashboard/outils` | Simulateur épargne + simulateur locatif |
| `/dashboard/alertes` | Publications des 30 derniers jours |
| `/dashboard/profil` | Formulaire profil + changement mot de passe + logout |

### Pages admin (28 pages)

| Section | Pages | Fonctionnalités |
|---------|-------|-----------------|
| Dashboard | 1 | KPIs (revenu, membres, ventes, newsletter), graphiques Recharts, activité récente |
| Ebooks | 3 (list, new, edit) | CRUD avec preview cover, upload fichier, lead magnet |
| Articles | 3 | CRUD avec badges source (manual/ai), score qualité coloré |
| Membres | 2 | Liste profils + fiche détaillée (achats, campagnes, promote/demote) |
| Clients | 2 | Tous les utilisateurs avec stats achats agrégées |
| Campagnes | 3 | Séquences email, ciblage par tags, scoring engagement, génération IA |
| Newsletter | 1 | Abonnés actifs/inactifs, stats par source |
| Ventes | 1 | CA total/mensuel, tableau ventes, export CSV |
| Factures | 1 | Tableau factures, lien PDF |
| Médiathèque | 1 | Upload/delete/copier URL, grille médias |
| IA | 3 | Stats API (appels, tokens, taux), générateur articles, scoring qualité |
| BRVM | 3 | Documents indexés, trigger scraping, downloader PDF, maintenance |
| Pop-up | 1 | Config lead magnet, stats conversion |
| Config | 1 | Configuration site par catégorie |
| Pages | 2 | CRUD pages légales (markdown) |
| Notifications | 1 | Historique notifications admin |

---

## 7. Routes API — app/api/

### Vue d'ensemble (48 routes)

#### Authentification des routes

| Méthode | Cible | Description |
|---------|-------|-------------|
| **Bearer token** | `INTERNAL_API_TOKEN` | Routes cron/système (scraping, newsletters, rapports) |
| **Session admin** | Supabase Auth + `role='admin'` | Routes admin UI |
| **Session user** | Supabase Auth (connecté) | Dashboard, achats |
| **Public** | Aucune auth | Newsletter subscribe, popup config, tracking |
| **Rate-limited** | IP-based | Newsletter subscribe (5/min), purchases (3/min) |

#### Articles

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/articles` | POST | Bearer | Injection IA d'articles (upsert sur slug) |
| `POST /api/articles/score` | POST | Admin | Scoring qualité via Claude (1 article ou batch 50) |

#### Auth

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/auth/signout` | POST | — | Supprime cookies sb-*, retourne `{ ok: true }` |

#### Admin

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/admin/brvm-trigger` | POST | Admin | Proxy vers /api/brvm/scrape |
| `POST /api/admin/config` | POST | Admin | Update site_config via FormData |
| `POST /api/admin/create-member` | POST | Admin | Crée user + profil admin |
| `GET /api/admin/ebooks/diagnose` | GET | Admin | Diagnostic livraison ebook (8 checks) |
| `POST /api/admin/ebooks/upload-file` | POST | Admin | Upload PDF/ePub/ZIP (max 100MB) |
| `POST /api/admin/generate-article` | POST | Admin | Génération article via Claude |
| `GET/POST /api/admin/notifications` | GET/POST | Admin | Liste notifications / marquer lu |
| `POST /api/admin/purchases/cancel-stale` | POST | Admin/Bearer | Annule achats pending > Xh |
| `GET /api/admin/purchases/diagnose` | GET | Admin | Diagnostic achat par email/id/user |
| `POST /api/admin/purchases/repair` | POST | Admin | Répare achat (mark_paid, link_user, resend, cancel) |
| `GET /api/admin/ventes/export` | GET | Admin | Export CSV des ventes |

#### BRVM (veille documentaire)

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `GET /api/brvm/diagnose` | GET | Bearer/Admin | Diagnostic live brvm.org + snapshot DB |
| `GET /api/brvm/documents` | GET | Admin | Liste paginée avec filtres (type, source, date, search) |
| `POST /api/brvm/documents/[id]/process` | POST | Admin | Marquer document traité |
| `POST /api/brvm/download` | POST | Bearer/Admin | Télécharge PDFs d'une période → bucket Storage |
| `GET /api/brvm/download?document_id=` | GET | Admin | Signed URL 5min vers PDF archivé |
| `POST /api/brvm/export` | POST | Bearer/Admin | Export données marché par période |
| `GET /api/brvm/maintenance` | GET | Bearer/Admin | Rapport de santé complet |
| `POST /api/brvm/scrape` | POST | Bearer | Scraping complet synchrone (30-90s) |
| `POST /api/brvm/scrape/async` | POST | Bearer | Scraping fire-and-forget (retourne 202 immédiatement) |
| `POST /api/brvm/scrape/boc` | POST | Bearer | Scraping BOC uniquement (3 pages) |
| `POST /api/brvm/scrape/rapports` | POST | Bearer | Scraping rapports sociétés cotées |
| `POST /api/brvm/scrape/annonces` | POST | Bearer | Scraping annonces (8 catégories) |
| `POST /api/brvm/summarize` | POST | Bearer | Résumé IA quotidien + email admins |
| `POST /api/brvm/weekly-digest` | POST | Bearer | Synthèse hebdo → article brouillon |

#### Campagnes email

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/campaigns/generate-email` | POST | Bearer | Génère contenu email via Claude |
| `POST /api/campaigns/process` | POST | Bearer | Processeur automatique (3 emails/semaine max par abonné) |

#### Commerce

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `GET /api/ebooks/download` | GET | User | Signed URL 5min après vérification purchase paid |
| `GET /api/purchases/check` | GET | User | Vérifie si user a acheté un ebook |
| `POST /api/purchases/create` | POST | User | Crée purchase pending + transaction FedaPay |
| `POST /api/webhooks/fedapay` | POST | — | Webhook HMAC — confirme paiement + email + facture |
| `POST /api/invoices/generate` | POST | Bearer | Génère facture PDF + upload Storage |

#### Newsletter & email

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/newsletter/subscribe` | POST | Public (rate-limited) | Inscription newsletter (upsert + welcome) |
| `POST /api/newsletter/send` | POST | Bearer | Newsletter IA via Claude + SMTP |
| `POST /api/newsletter/weekly` | POST | Bearer | Newsletter template statique (sans Claude) |
| `POST /api/notifications/send-email` | POST | Bearer | Envoie notifications admin par email |

#### Tracking & analytics

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `POST /api/track` | POST | Public | Page views + events (vérifie consent) |
| `GET /api/track/open?id=` | GET | Public | Pixel 1x1 GIF (open tracking) |
| `GET /api/track/click?id=&url=` | GET | Public | Redirect tracking (same-domain only) |

#### Divers

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `GET /api/config/public` | GET | Public | Config publique par clés |
| `GET /api/popup/config` | GET | Public | Config pop-up active |
| `POST /api/popup/send-lead-magnet` | POST | Public (rate-limited) | Envoie lead magnet par email |
| `POST /api/reports/monthly` | POST | Bearer | Rapport mensuel → notification admin |
| `POST/GET/DELETE /api/media/*` | Mixte | Admin | Upload/liste/suppression médias |

---

## 8. Scripts utilitaires — scripts/

| Script | Commande | Rôle |
|--------|----------|------|
| `promote-admin.mjs` | `node scripts/promote-admin.mjs <email>` | Promouvoir un user en admin (service_role) |
| `list-admins.mjs` | `node scripts/list-admins.mjs` | Lister admins et premiers 10 membres |
| `seed-articles.mjs` | `node scripts/seed-articles.mjs` | Insérer 3 articles de base (BRVM, patrimoine, ChatGPT) |
| `seed-ebooks.mjs` | `node scripts/seed-ebooks.mjs` | Insérer 7 ebooks (4900-9900 FCFA) |
| `seed-first-campaign.mjs` | `node scripts/seed-first-campaign.mjs` | Créer séquence welcome 5 emails (10 jours) |
| `seed-pages.mjs` | `node scripts/seed-pages.mjs` | Insérer page "À propos" |
| `shoot.mjs` | `node scripts/shoot.mjs` | Screenshots Playwright (9 pages × 2 thèmes) |
| `brvm-health-check.ts` | `npx tsx scripts/brvm-health-check.ts` | Diagnostic santé BRVM (exit codes 0-3) |
| `brvm-maintenance-report.ts` | `npx tsx scripts/brvm-maintenance-report.ts` | Rapport maintenance markdown |
| `cancel-stale-purchases.ts` | `npx tsx scripts/cancel-stale-purchases.ts` | Annule achats pending > 2h |
| `download-brvm-pdfs.ts` | `npx tsx scripts/download-brvm-pdfs.ts --from=... --to=...` | Téléchargement bulk PDFs BRVM |
| `import-brvm-history.ts` | `npx tsx scripts/import-brvm-history.ts` | Import historique depuis miroir HTTrack local |

---

## 9. Migrations SQL — supabase/migrations/

### Chronologie

| # | Fichier | Tables créées/modifiées | Description |
|---|---------|------------------------|-------------|
| 001 | `001_ebooks.sql` | `ebooks` | Catalogue ebooks (prix, features, cover, slug unique) |
| 002 | `002_articles.sql` | `articles` | Blog (markdown, source manual/ai, quality_score) |
| 003 | `003_profiles.sql` | `profiles` | Profils + trigger auto-création sur auth.users INSERT |
| 004 | `004_purchases.sql` | `purchases` | Achats FedaPay (status, payment_ref unique, raw_payload) |
| 005 | `005_pages.sql` | `pages` | Pages institutionnelles (slug unique, markdown) |
| 006 | `006_metadata.sql` | — | Ajoute `metadata jsonb` + index GIN sur 5 tables |
| 007 | `007_last_visit.sql` | — | `profiles.last_visit_at` pour engagement |
| 008 | `008_fix_rls_recursion.sql` | — | Supprime policy récursive `profiles_admin_read` |
| 009 | `009_newsletter_subscribers.sql` | `newsletter_subscribers` | Abonnés newsletter (remplace Brevo) |
| 010 | `010_campaigns.sql` | `campaigns`, `campaign_emails`, `campaign_sends` | Campagnes email avec tracking |
| 011 | `011_tracking.sql` | `page_views`, `user_events` | Analytics comportementales |
| 012 | `012_popup_config.sql` | `popup_config` | Configuration pop-up lead magnet |
| 013 | `013_site_config.sql` | `site_config` | CMS configuration (25+ clés, seed initial) |
| 014 | `014_invoices.sql` | `invoices` | Factures PDF (numéro HJV-YYYY-NNNN auto) |
| 015 | `015_notifications.sql` | `admin_notifications` | Alertes admin |
| 016 | `016_ai_logs.sql` | `ai_logs` | Journal appels Claude |
| 017 | `017_megafix.sql` | — | Email normalization, 4 triggers notification, 37 configs |
| 018 | `018_corrections_textes.sql` | — | Mise à jour contenu site_config et page à-propos |
| 019 | `019_brvm_data.sql` | `brvm_data` | Données marché BRVM (legacy) |
| 020 | `020_brvm_refactor.sql` | `brvm_sources`, `brvm_documents` | Veille documentaire (checksum, sources, triggers) |
| 021 | `021_ebook_files.sql` | — | `ebooks.file_path` + bucket privé `ebook-files` |
| 023 | `023_brvm_clean_reset.sql` | — | Reset complet brvm_sources + brvm_documents |

---

## 10. Schéma des tables Supabase

### Tables principales (17)

```
┌─────────────────┐     ┌─────────────────┐
│   auth.users    │◄────│    profiles      │
│   (Supabase)    │     │ id, email, role  │
└────────┬────────┘     │ full_name, phone │
         │              │ country, metadata│
         │              └────────┬────────┘
         │                       │
    ┌────┴────┐            ┌─────┴─────┐
    │purchases│            │newsletter_ │
    │ user_id │            │subscribers │
    │ ebook_id├──┐         │ email, tags│
    │ status  │  │         │ campaign_* │
    │ amount  │  │         └─────┬─────┘
    └────┬────┘  │               │
         │       │         ┌─────┴─────┐
    ┌────┴────┐  │         │ campaigns  │
    │invoices │  │         │ name, type │
    │ pdf_url │  │         │ status     │
    └─────────┘  │         └─────┬─────┘
                 │               │
           ┌─────┴─────┐  ┌─────┴──────────┐
           │  ebooks    │  │campaign_emails  │
           │ title,slug │  │ position, delay │
           │ price      │  │ subject, body   │
           │ file_path  │  └─────┬──────────┘
           └───────────┘        │
                           ┌────┴──────────┐
                           │campaign_sends  │
                           │ status, opened │
                           │ clicked_at     │
                           └───────────────┘

┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   articles      │   │    pages        │   │  site_config    │
│ title, slug     │   │ slug, title     │   │ key, value      │
│ body, category  │   │ body markdown   │   │ type, category  │
│ source, score   │   │ meta_desc       │   │ label           │
└─────────────────┘   └─────────────────┘   └─────────────────┘

┌─────────────────┐   ┌─────────────────┐
│  popup_config   │   │admin_notifications│
│ ebook_id        │   │ type, title      │
│ is_active       │   │ is_read, priority│
│ display_delay   │   │ email_sent       │
└─────────────────┘   └──────────────────┘

┌─────────────────┐   ┌─────────────────┐
│   page_views    │   │  user_events    │
│ session_id      │   │ event_type      │
│ path, referrer  │   │ metadata        │
└─────────────────┘   └─────────────────┘

┌─────────────────┐
│    ai_logs      │
│ action, model   │
│ tokens, status  │
└─────────────────┘

┌─────────────────────────────────────────┐
│           BRVM SUBSYSTEM                 │
│  ┌──────────────┐   ┌────────────────┐  │
│  │ brvm_sources │   │ brvm_documents │  │
│  │ slug, priority│◄──│ source_id      │  │
│  │ last_scraped │   │ doc_type, title│  │
│  └──────────────┘   │ checksum (UNQ) │  │
│                      │ pdf_url        │  │
│  ┌──────────────┐   │ is_new/processed│ │
│  │  brvm_data   │   └────────────────┘  │
│  │  (legacy)    │                        │
│  └──────────────┘                        │
└─────────────────────────────────────────┘
```

### Stratégie RLS

| Table | Lecture publique | Lecture user | Écriture | Admin |
|-------|-----------------|-------------|----------|-------|
| ebooks | is_published=true | — | — | service_role |
| articles | is_published=true + published_at ≤ now | — | — | service_role |
| pages | Tout public | — | — | service_role |
| profiles | — | Propre profil (auth.uid=id) | Propre profil | service_role |
| purchases | — | user_id ou email match | — | service_role |
| newsletter_subscribers | — | — | INSERT public | service_role |
| site_config | Lecture publique | — | — | service_role |
| brvm_* | — | — | — | admin role + service_role |
| Autres (campaigns, tracking, logs) | — | — | — | service_role |

---

## 11. Flux de données critiques

### Flux d'achat (FedaPay)

```
1. User clique "Acheter" sur /ebooks/[slug]
   └→ BuyButton → POST /api/purchases/create
       ├→ Vérifie auth + ebook publié + pas déjà acheté
       ├→ Nettoie anciens pending > 30 min
       ├→ Crée purchase status=pending
       ├→ Crée transaction FedaPay (SDK serveur)
       ├→ Génère token paiement
       └→ Retourne payment_url → redirection navigateur

2. User paie sur FedaPay (Wave/Orange Money/MTN/carte)
   └→ FedaPay envoie webhook POST /api/webhooks/fedapay
       ├→ Vérifie transaction via API FedaPay
       ├→ Update purchase status=paid
       ├→ Envoie email confirmation
       ├→ Crée notification admin
       └→ Déclenche génération facture (async)

3. User retourne sur /merci?ref=...
   └→ Page vérifie status purchase
       ├→ "paid" → message succès + lien dashboard
       ├→ "pending" → MerciAutoRefresh (poll 5s × 24)
       └→ "failed" → message erreur + contact
```

### Flux de scraping BRVM

```
Cron (cron-job.org) → POST /api/brvm/scrape/async (Bearer token)
    └→ 202 Accepted immédiat
    └→ En arrière-plan : runFullScrape()
        ├→ 1. Cours actions + indices (sikafinance.com)
        │   └→ INSERT brvm_data
        ├→ 2. BOC listing (brvm.org, 3 pages)
        │   └→ Pour chaque PDF : computeChecksum() → upsertDocument()
        │       ├→ Nouveau → INSERT + trigger notification admin
        │       └→ Existant → skip (checksum match)
        ├→ 3. Rapports sociétés (brvm.org)
        │   └→ Même dédup par checksum
        ├→ 4. Annonces 8 catégories (brvm.org)
        │   └→ Même dédup par checksum
        └→ 5. Notification admin agrégée
            └→ "Scrape terminé : X BOC, Y rapports, Z annonces"
```

### Flux de campagne email

```
1. Admin crée campagne dans /admin/campagnes/new
2. Admin ajoute emails à la séquence (position, delay_days)
3. Admin génère contenu via Claude (bouton "Générer")
4. Admin active la campagne (status → active)

5. Cron → POST /api/campaigns/process (Bearer token)
   └→ Pour chaque campagne active :
       ├→ Récupère abonnés ciblés (tags overlap)
       ├→ Filtre ceux "due" pour le prochain email (delay_days)
       ├→ Pour chaque abonné :
       │   ├→ Vérifie cap hebdo (3 emails max)
       │   ├→ Insère tracking pixel + links
       │   ├→ Envoie via SMTP
       │   └→ Avance campaign_step
       └→ Retourne compteurs (processed, sent, skipped)

6. Tracking automatique :
   - Pixel 1x1 GIF → GET /api/track/open?id=SEND_ID
   - Liens réécrits → GET /api/track/click?id=SEND_ID&url=TARGET
```

---

## 12. Variables d'environnement

### `.env.local` (fichier requis, non versionné)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://egp.hedjav.com
INTERNAL_API_TOKEN=<token pour routes API internes>

# SMTP Hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@egp.hedjav.com
SMTP_PASS=<mot de passe>
SMTP_FROM=noreply@egp.hedjav.com

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# FedaPay
FEDAPAY_API_KEY=sk_live_...
FEDAPAY_WEBHOOK_SECRET=<secret HMAC>

# Admin (legacy)
ADMIN_SETUP_CODE=<code bootstrap>
```

### Comportement si variable manquante

| Variable | Comportement si absente |
|----------|------------------------|
| SUPABASE_URL/KEY | Crash au démarrage (middleware) |
| SMTP_HOST | Emails loggés en console (pas de crash) |
| ANTHROPIC_API_KEY | Génération IA skip (retourne `skipped: true`) |
| FEDAPAY_WEBHOOK_SECRET | Webhooks acceptés sans vérification (dev mode) |
| INTERNAL_API_TOKEN | Routes API Bearer retournent 401 |

---

## 13. Déploiement

### Architecture production

```
┌──────────────────────────────────────────┐
│            Hostinger VPS                  │
│                                          │
│  ┌──────────┐     ┌──────────────────┐   │
│  │  Nginx   │────►│  PM2 cluster     │   │
│  │ (reverse │     │  ┌────────────┐  │   │
│  │  proxy   │     │  │ hedjav     │  │   │
│  │  + SSL)  │     │  │ :3000      │  │   │
│  └──────────┘     │  │ (N workers)│  │   │
│                    │  └────────────┘  │   │
│                    └──────────────────┘   │
└──────────────────────────────────────────┘
         │
    ┌────┴────┐
    │Cloudflare│ ← DNS + CDN + SSL
    └─────────┘
```

### Processus de déploiement

```bash
# Sur le VPS
cd /var/www/hedjav-web
bash scripts/deploy.sh
# → git pull → npm ci → npm run build → pm2 reload
```

### Crons recommandés (cron-job.org)

| Fréquence | Route | Description |
|-----------|-------|-------------|
| Quotidien 18h UTC | `POST /api/brvm/scrape/async` | Scraping BRVM complet |
| Quotidien 18h30 UTC | `POST /api/brvm/summarize` | Résumé IA + email |
| Vendredi 19h UTC | `POST /api/brvm/weekly-digest` | Synthèse hebdo → article |
| Toutes les 30 min | `GET /api/brvm/maintenance` | Santé BRVM |
| Toutes les heures | `POST /api/admin/purchases/cancel-stale` | Nettoyage pending |
| Hebdomadaire | `POST /api/newsletter/weekly` | Newsletter digest |
| 1er du mois | `POST /api/reports/monthly` | Rapport mensuel |
| Quotidien | `POST /api/campaigns/process` | Processeur campagnes |

---

## Annexe : Patterns architecturaux clés

### 1. Graceful Degradation
- Variables env manquantes → fallback console/skip (jamais de crash)
- Erreurs requêtes → arrays vides (pas d'exceptions)
- Erreurs email → loggées mais non bloquantes

### 2. Idempotence
- Documents BRVM : dédup par checksum SHA256
- Factures : vérifie existence avant création
- Newsletter : upsert sur email normalisé

### 3. Result Types
Toutes les mutations retournent `{ ok: true } | { ok: false, error }` — pas de try/catch à l'appelant.

### 4. Service Role Strategy
Admin operations bypass RLS via service_role key, protégé par `requireAdmin()` côté application. Jamais exposé côté client.

### 5. Security
- Rate limiting IP sur endpoints publics
- HMAC-SHA256 timing-safe pour webhooks
- Normalisation email (Gmail dots/+tags)
- Validation redirect anti-open-redirect
- CSP restrictive avec whitelist
- Upload : validation MIME + extension + taille

### 6. Observabilité
- `ai_logs` : chaque appel Claude tracé (tokens, durée, erreurs)
- `admin_notifications` : événements critiques avec triggers PG
- `brvm_maintenance` : santé système avec recommandations
- Diagnostics endpoints pour debugging

---

*Fin du rapport — ~170 fichiers source analysés, 48 routes API documentées, 17 tables Supabase décrites.*
