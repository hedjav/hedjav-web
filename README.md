# hedjav.com

> **École en ligne de la Gestion de Patrimoine — Zone UEMOA**
>
> Plateforme numérique de Hermann D. AVAHOUIN — analyste financier, 17 ans d'expérience à Bank of Africa Bénin, fondateur de KTALYZ Conseils.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## 🎯 Vision

Hedjav est l'**école en ligne** de référence pour la gestion de patrimoine en zone UEMOA (8 pays d'Afrique francophone). Ebooks pratiques, formations BRVM, analyses exclusives et outils patrimoniaux pour bâtir un patrimoine durable au Bénin, en Côte d'Ivoire, au Sénégal et dans toute l'Afrique francophone.

**Cible long terme** : 174 M FCFA/an de revenus à maturité (Phase 4 — An 4).

## ✨ Fonctionnalités clés (Phase 1 livrée)

### 📚 Catalogue & contenu
- **Boutique ebooks** avec page de vente, badge promo, redirection FedaPay (Wave / Orange Money / MTN MoMo / carte)
- **Blog** Supabase (markdown) avec catégories, JSON-LD, articles liés, newsletter inline
- **Page À propos** Hermann (contenu CMS dans table `pages`)
- **Sitemap** dynamique + **robots.txt**

### 👥 Espace membre
- **Inscription / connexion** Supabase Auth (email confirmation obligatoire)
- **Dashboard moderne** avec tabs horizontales, avatar, 4 cards visuelles
- **Outils patrimoniaux** : 2 simulateurs interactifs (épargne long terme + rendement locatif UEMOA)
- **Mes ebooks**, **Mes commandes**, **Mes alertes** (nouveautés depuis dernière visite)
- **Profil** : édition + changement de mot de passe + déconnexion

### 🛡 Admin (role='admin')
- **Dashboard stats** : ebooks, articles, membres, ventes
- **CRUD ebooks et articles** avec Server Actions service-role
- **Gestion membres** avec promotion/rétrogradation admin
- **Section Outils IA** pré-câblée (génération articles, scoring qualité, publication auto…)
- **`/admin-setup`** : bootstrap du premier admin via code secret

### 💳 Paiement & emails
- **API webhook FedaPay** signé HMAC-SHA256 → upsert `purchases` → email Brevo
- **Newsletter Brevo** avec double opt-in
- **API d'injection IA** : `POST /api/articles` (bearer token) — un agent IA peut publier sans toucher au code

### 🔍 SEO & perf
- **JSON-LD** Product / Article / Organization
- **OG images** par page
- **Output `standalone`** Next.js pour PM2 cluster sur Hostinger VPS

---

## 🏗 Stack technique

| Composant | Solution |
|-----------|---------|
| Framework | **Next.js 16** App Router + Server Components + Server Actions |
| Langage | **TypeScript 5.x** strict mode |
| Styles | **Tailwind CSS v4** + variables CSS hedjav (charte navy/or/cream) |
| BDD / Auth | **Supabase** PostgreSQL + RLS + `@supabase/ssr` |
| Email | **Brevo** REST API (graceful no-op si non configuré) |
| Paiement | **FedaPay** (webhook HMAC) |
| Hébergement | **Hostinger VPS** (PM2 + Nginx + standalone) |
| CDN / DNS | **Cloudflare** |
| Markdown | `react-markdown` + `remark-gfm` + **`rehype-sanitize`** (sécurité contenu IA) |

### Stack future (Phases 2–4 — pas encore branchée)
- **Mux** (vidéo formations LMS)
- **Typesense** (recherche full-text)
- **Calendly** (booking webinaires & consulting)
- **Vercel AI SDK + Claude API** (chatbot patrimoine, génération de contenu)
- **PostHog** (analytics produit)
- **Sentry** (error tracking)
- **Expo + React Native** (app mobile)

---

## 🚀 Démarrage rapide

```bash
# 1. Cloner le repo
git clone https://github.com/hedjav/hedjav-web.git
cd hedjav-web

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.local.example .env.local
# → remplir les vraies clés Supabase, Brevo, FedaPay…

# 4. Lancer le serveur de dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Bootstrap du premier administrateur

1. Aller sur `/register`, créer un compte avec un email valide
2. Vérifier l'email reçu (confirmation Supabase)
3. Se rendre sur `/admin-setup` une fois connecté
4. Saisir le `ADMIN_SETUP_CODE` défini dans `.env.local`
5. Le compte est promu admin → redirection automatique vers `/admin`

> Une fois un admin créé, `/admin-setup` renvoie 404 définitivement.

### Migrations Supabase

Exécuter dans Supabase Dashboard → SQL Editor, dans cet ordre :

```
supabase/migrations/001_ebooks.sql
supabase/migrations/002_articles.sql
supabase/migrations/003_profiles.sql
supabase/migrations/004_purchases.sql
supabase/migrations/005_pages.sql
supabase/migrations/006_metadata.sql
supabase/migrations/007_last_visit.sql
```

Puis seed les données initiales :
```bash
node scripts/seed-ebooks.mjs
node scripts/seed-articles.mjs
node scripts/seed-pages.mjs
```

---

## 📁 Structure

```
app/
  (admin)/      → admin UI dark, protégé role='admin'
  (auth)/       → login, register, forgot/reset password
  (dashboard)/  → espace membre protégé (dashboard, profil, outils, alertes)
  (public)/     → pages publiques (ebooks, blog, a-propos, merci)
  api/          → endpoints (articles, newsletter, purchases, webhooks, auth)
  admin-setup/  → bootstrap du premier admin (auto-404 si admin existant)
components/
  features/     → cards, formulaires, simulateurs, composants métier
  home/         → sections de la page d'accueil
  layout/       → header, footer, mobile nav
lib/
  admin/        → server actions admin + setup
  auth/         → helpers session, server actions, pays UEMOA
  brevo/        → client REST Brevo
  ebooks/, articles/, purchases/, pages/, dashboard/  → queries Supabase
  fedapay/      → vérif HMAC webhook
  supabase/     → clients SSR + types
supabase/
  migrations/   → scripts SQL à exécuter dans Supabase Dashboard
scripts/
  seed-*.mjs    → seed initial des tables
  shoot.mjs     → screenshots playwright pour QA visuelle
  deploy.sh     → script de déploiement VPS
```

---

## 🚢 Déploiement

Tout est documenté dans **[`DEPLOY.md`](./DEPLOY.md)** :
- Prérequis Hostinger VPS (Node 20, PM2, Nginx)
- Configuration Cloudflare DNS
- Migrations Supabase
- Granting admin
- Script `deploy.sh` (`git pull → npm ci → build → pm2 reload`)

---

## 📚 Documentation

- **[`CLAUDE.md`](./CLAUDE.md)** — état complet du projet, vision 4 phases, règles d'architecture
- **[`AGENTS.md`](./AGENTS.md)** — règles pour agents IA Next.js 16
- **[`DEPLOY.md`](./DEPLOY.md)** — guide déploiement Hostinger VPS

---

## 🤝 Crédits

Conception, développement et maintenance par **[KTALYZ SARL](https://ktalyz.com)** — Cotonou, Bénin.

Maître d'ouvrage : **Hermann D. AVAHOUIN** — analyste financier, expert patrimoine UEMOA.

> *Démocratiser une expertise patrimoniale jusqu'ici réservée à une élite, ancrée dans les réalités fiscales, économiques et culturelles de l'Afrique francophone.*

---

## 📄 Licence

Propriétaire — © 2026 KTALYZ SARL & Hermann D. AVAHOUIN. Tous droits réservés.
