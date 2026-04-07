@AGENTS.md
# hedjav.com — Contexte projet pour Claude Code
 
## Qui suis-je ?
Je suis le développeur de hedjav.com, débutant en Next.js.
Maître d'ouvrage : Hermann D. AVAHOUIN — expert gestion de patrimoine, Bénin.
Maître d'œuvre : KTALYZ SARL.
 
---
 
## Stack technique
 
| Composant | Solution |
|-----------|---------|
| Framework | Next.js 16 App Router |
| Langage | TypeScript |
| Styles | Tailwind CSS v4 + CSS variables custom |
| Composants UI | shadcn/ui |
| Backend / BDD | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Hébergement | **Hostinger VPS** — PM2 + Nginx (PAS Vercel) |
| CDN / DNS | Cloudflare |
| Email | Brevo (SMTP transactionnel + automation) |
| Paiement | CinetPay (Wave, Orange Money, MTN MoMo) |
| IA | Claude API — claude-sonnet-4-6 |
| Versioning | GitHub — repo : hedjav/hedjav-web |
 
---
 
## Identité visuelle
 
### Couleurs (variables CSS dans globals.css)
```
--n900: #1B2A4A   Navy primaire — textes, backgrounds foncés
--n950: #0D1628   Navy profond — sidebar, footer
--g500: #C5A028   Or accent — CTA, badges, liens actifs
--cream:#F8F5EE   Fond de page
--white:#FFFFFF   Surfaces cartes
```
 
### Typographies
```
--fd : 'Cormorant Garamond' — titres, hero, logo
--fb : 'DM Sans'            — corps, navigation, UI
--fm : 'DM Mono'            — prix FCFA, données BRVM, tokens
```
 
### Logo
`Hedjav` — texte brut, font Cormorant Garamond weight 600.
ZÉRO décoration. Pas de span coloré, pas d'accent sur H ou AV.
 
---
 
## Règles absolues de code
 
### CSS
- Toujours utiliser les variables CSS (`var(--n900)`) — jamais de couleurs brutes (`#1B2A4A`)
- Toujours utiliser les tokens d'espacement (`var(--s4)`) — jamais de valeurs brutes (`16px`)
- Le dark mode se gère via `[data-theme="dark"]` sur `<html>` — utiliser next-themes
- **Interdit : `@import url('https://fonts.googleapis.com/...')` dans les CSS** — toutes les fonts passent par `next/font/google` dans `app/layout.tsx`
 
### React / Next.js
- Server Components par défaut — `'use client'` seulement si interaction ou hooks nécessaires
- Données depuis Supabase : `lib/supabase/server.ts` côté serveur
- Jamais de secret dans le code — toujours `.env.local`
- Variables publiques : `NEXT_PUBLIC_` seulement pour données non sensibles
- **Langue** : tout le contenu front est en **français** — `<html lang="fr">`, textes UI en français
- **Dark mode** : `next-themes` configuré avec `attribute="data-theme"`, `defaultTheme="light"`, `enableSystem={false}`. Provider unique : `components/providers/ThemeProvider.tsx`
 
### Composants
- Composants shadcn/ui dans `components/ui/`
- Composants métier hedjav dans `components/features/`
- Layouts dans `components/layout/` (Header, Footer, MobileNav, ThemeToggle, nav-links.ts)
- Providers globaux dans `components/providers/`

### Contacts & comptes publics
- **Email public unique** : `hedjav@gmail.com` — seul email affichable côté front
- **Privé, jamais en front** : `ktalyzconseils@gmail.com`
- **Réseaux sociaux officiels** (validés HEAD 200 le 2026-04-08) :
  - Facebook : https://www.facebook.com/hedjav
  - Instagram : https://www.instagram.com/hedjav
  - X : https://x.com/hedjav
  - TikTok : https://www.tiktok.com/@hedjav
  - WhatsApp : https://wa.me/22901978903630
  - LinkedIn : ⚠️ compte inexistant au 2026-04-08 — ne pas afficher tant que non créé
 
### Git
- Branches : `feature/nom-feature` pour chaque nouvelle fonctionnalité
- Commits courts et descriptifs en français : `feat: hero section`, `fix: nav mobile`
- Toujours committer avant de demander une grosse modification à Claude Code
 
---
 
## Structure du projet
 
```
hedjav-web/
├── CLAUDE.md                    ← ce fichier
├── app/
│   ├── layout.tsx               ← layout global (fonts, providers, metadata)
│   ├── page.tsx                 ← page d'accueil
│   ├── globals.css              ← tokens CSS hedjav (NE PAS modifier les tokens)
│   ├── (public)/
│   │   ├── blog/
│   │   │   ├── page.tsx         ← liste articles
│   │   │   └── [slug]/page.tsx  ← article MDX
│   │   ├── ebooks/
│   │   │   ├── page.tsx         ← catalogue ebooks
│   │   │   └── [slug]/page.tsx  ← page de vente
│   │   └── newsletter/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   └── page.tsx             ← espace membre connecté
│   ├── (admin)/
│   │   ├── layout.tsx           ← layout admin dark (role='admin' requis)
│   │   ├── page.tsx             ← dashboard stats
│   │   ├── articles/
│   │   ├── ebooks/
│   │   └── membres/
│   ├── api/
│   │   └── webhooks/
│   │       └── cinetpay/route.ts ← webhook paiement HMAC
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                      ← shadcn/ui customisés charte hedjav
│   ├── features/                ← composants métier (EbookCard, ArticleCard...)
│   └── layout/                  ← Header, Footer, Sidebar
├── lib/
│   ├── supabase/
│   │   ├── server.ts            ← client Supabase SSR (cookies)
│   │   └── client.ts            ← client Supabase navigateur
│   ├── brevo/                   ← emails transactionnels
│   ├── cinetpay/                ← paiement Wave/OM + webhook
│   └── claude/                  ← prompts et appels Claude API
├── content/
│   └── blog/                    ← articles .mdx
├── middleware.ts                ← protection routes /dashboard /admin
├── ecosystem.config.js          ← config PM2 pour Hostinger VPS
└── .env.local                   ← variables d'environnement (NE PAS committer)
```
 
---
 
## Variables d'environnement (.env.local)
 
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
 
# CinetPay
CINETPAY_API_KEY=xxx
CINETPAY_SITE_ID=xxx
CINETPAY_SECRET_KEY=xxx
 
# Brevo
BREVO_API_KEY=xxx
BREVO_NEWSLETTER_LIST_ID=xxx
 
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx
 
# App
NEXT_PUBLIC_APP_URL=https://hedjav.com
```
 
---
 
## Tables Supabase (Phase 1)
 
```sql
users        -- Auth Supabase (géré automatiquement)
profiles     -- user_id, subscription_level, country, newsletter_opt
ebooks       -- id, title, slug, price_fcfa, cover_url, file_url, published
purchases    -- id, user_id, ebook_id, amount, payment_ref, status
articles     -- id, slug, title, body_mdx, category, published_at, author_id
```
 
---
 
## Flux paiement CinetPay
 
```
Clic [Acheter] → Server Action → API CinetPay init →
Redirect page paiement Wave/OM → Paiement utilisateur →
Webhook POST /api/webhooks/cinetpay → Vérif HMAC-SHA256 →
INSERT purchases Supabase → Email PDF Brevo → Accès débloqué RLS
```
 
---
 
## Déploiement Hostinger VPS
 
```bash
# Build local
npm run build
 
# Copier sur VPS et recharger PM2
pm2 reload hedjav
 
# Config Nginx : /etc/nginx/sites-available/hedjav.com
# Config PM2   : ecosystem.config.js (output: 'standalone')
```
 
---
 
## Ordre de développement (Phase 1)
 
1. globals.css + layout.tsx ← EN COURS
2. Header + Footer
3. Page d'accueil (Hero, ebooks, blog, newsletter)
4. Page ebook + page de vente
5. Blog MDX
6. Supabase Auth + tables
7. CinetPay + webhook
8. Dashboard membre
9. Admin UI
10. Déploiement VPS
 
---
 
## Ce que Claude Code doit toujours faire
 
- Lire les fichiers existants AVANT de modifier quoi que ce soit
- Proposer un plan (fichiers créés / modifiés) avant de coder
- Utiliser UNIQUEMENT les variables CSS définies dans globals.css
- Créer une branche git pour chaque feature : `git checkout -b feature/nom`
- Committer après chaque étape validée
- Ne jamais toucher à globals.css sans demande explicite