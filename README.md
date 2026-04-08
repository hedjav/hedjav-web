# hedjav.com

Site web de [Hedjav](https://hedjav.com) — gestion de patrimoine pour l'Afrique francophone.

## Stack

| Composant | Solution |
|-----------|---------|
| Framework | Next.js 16 (App Router) |
| Langage   | TypeScript |
| Styles    | Tailwind CSS v4 + variables CSS hedjav |
| Backend   | Supabase (PostgreSQL + Auth + RLS) |
| Email     | Brevo (newsletter + transactionnel) |
| Paiement  | FedaPay (Wave, Orange Money, MTN MoMo) |
| Hébergement | Hostinger VPS (PM2 + Nginx) |
| CDN/DNS   | Cloudflare |

## Démarrage local

```bash
git clone https://github.com/hedjav/hedjav-web.git
cd hedjav-web
npm install
cp .env.local.example .env.local   # puis remplir les vraies valeurs
npm run dev
```

Ouvrir `http://localhost:3000`.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — instructions Claude Code, état du projet
- [`AGENTS.md`](./AGENTS.md) — règles pour les agents IA
- [`DEPLOY.md`](./DEPLOY.md) — guide complet de déploiement Hostinger VPS

## Structure

```
app/
  (admin)/    → admin UI dark, protégé role='admin'
  (auth)/     → login, register, forgot/reset password
  (dashboard)/ → espace membre protégé
  (public)/   → pages publiques (ebooks, blog, a-propos, merci)
  api/        → endpoints (articles, newsletter, purchases, webhooks)
components/
  features/   → cards, formulaires, composants métier
  home/       → sections de la page d'accueil
  layout/     → header, footer, mobile nav
  providers/  → ThemeProvider
lib/
  admin/      → server actions admin
  auth/       → helpers session + actions
  brevo/      → client REST Brevo
  ebooks/, articles/, purchases/, pages/ → queries Supabase
  fedapay/    → vérif HMAC webhook
  supabase/   → clients SSR + types
supabase/
  migrations/ → scripts SQL à exécuter dans Supabase Dashboard
scripts/
  seed-*.mjs  → seed initial des tables
  shoot.mjs   → screenshots playwright pour QA visuelle
  deploy.sh   → script de déploiement VPS
```
