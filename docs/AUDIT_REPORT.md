# Rapport d'audit de securite — egp.hedjav.com

**Date** : 2026-04-09
**Branche** : `feature/audit-complet`
**Auditeur** : Claude Code (audit automatise)

---

## Corrections appliquees

### Securite (critique)

| # | Probleme | Correction | Fichier |
|---|----------|------------|---------|
| 1 | Fuite d'info auth (login) | Message unique "Identifiants incorrects" au lieu du message Supabase | `lib/auth/actions.ts` |
| 2 | Open redirect `/api/track/click` | Validation URL : seul le domaine hedjav est autorise | `app/api/track/click/route.ts` |
| 3 | Open redirect `signInAction` | Param `next` restreint aux chemins relatifs (`/...`) | `lib/auth/actions.ts` |
| 4 | Upload sans limites | Taille max 10 Mo, types image/PDF uniquement, extensions dangereuses bloquees | `app/api/media/upload/route.ts` |
| 5 | Aucun rate limiting | `checkRateLimit()` applique sur newsletter/subscribe (5/min), purchases/create (3/min), popup/send-lead-magnet (3/min) | `lib/utils/rate-limit.ts` + 3 routes |
| 6 | `updatePasswordAction` : validation faible | Utilise `validatePassword()` au lieu d'un simple check longueur | `lib/auth/actions.ts` |
| 7 | `popup/send-lead-magnet` : pas de try/catch JSON | Ajout try/catch + validation email | `app/api/popup/send-lead-magnet/route.ts` |

### Headers de securite

| Header | Valeur |
|--------|--------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Strict-Transport-Security | max-age=63072000; includeSubDomains |
| Content-Security-Policy | self + supabase + fedapay + anthropic |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |

### Performance

| # | Correction | Fichier |
|---|-----------|---------|
| 1 | `<img>` remplace par `<Image>` next/image | `app/(admin)/admin/ebooks/EbooksTable.tsx` |
| 2 | `output: 'standalone'` confirme present | `next.config.ts` |
| 3 | Aucun `@import fonts.googleapis` trouve | OK |

### SEO

| Verification | Resultat |
|-------------|----------|
| Metadata sur /, /ebooks, /blog, /a-propos | OK (layout + pages) |
| sitemap.ts dynamique | OK (ebooks + articles) |
| robots.ts bloque /admin, /dashboard, /api | OK |
| JSON-LD Organization | OK (public layout) |

### Accessibilite

| # | Correction | Fichier |
|---|-----------|---------|
| 1 | `lang="fr"` confirme | `app/layout.tsx` |
| 2 | Skip-nav link ajoute | `app/(public)/layout.tsx` + `app/globals.css` |

### UX

| # | Correction | Fichier |
|---|-----------|---------|
| 1 | Eye toggle mot de passe sur LoginForm | `components/features/LoginForm.tsx` |

---

## Verifications sans probleme

- **Secrets** : aucun secret en dur dans le code. `.gitignore` couvre `.env*` et `.shots/`. Seules 3 vars `NEXT_PUBLIC_` autorisees.
- **Auth routes** : `/admin` et `/dashboard` proteges par proxy.ts. Toutes les routes `/api/admin/*` ont un double check session + role admin.
- **Routes API internes** : toutes protegees par `INTERNAL_API_TOKEN` (articles, newsletter/send, newsletter/weekly, campaigns, invoices, reports, brvm, notifications).
- **XSS** : `dangerouslySetInnerHTML` utilise uniquement avec `JSON.stringify()`. Markdown rendu via `rehype-sanitize`.
- **SQL** : aucune requete SQL brute. Seul `.rpc()` utilise (parametre).
- **console.log** : serveur uniquement (webhook fedapay, smtp fallback) — pas de fuite client.

---

## Actions manuelles requises

1. **Supabase RLS** : verifier que les politiques RLS sont bien configurees sur toutes les tables (non verifiable depuis le code).
2. **CORS** : configurer les origins autorisees dans Supabase Dashboard > API Settings.
3. **CSP fine-tuning** : si des scripts tiers sont ajoutes (analytics, chat), mettre a jour la CSP dans `next.config.ts`.
4. **Rotation des tokens** : changer `INTERNAL_API_TOKEN` et `FEDAPAY_WEBHOOK_SECRET` periodiquement.
5. **Backup** : configurer des sauvegardes automatiques de la base Supabase.

---

## Score

| Categorie | Score |
|-----------|-------|
| Secrets & configuration | 10/10 |
| Authentification & autorisation | 9/10 |
| Injection & validation | 9/10 |
| Headers securite | 10/10 |
| Rate limiting | 10/10 |
| Performance | 9/10 |
| SEO | 10/10 |
| Accessibilite | 8/10 |

**Score global : 94/100**
