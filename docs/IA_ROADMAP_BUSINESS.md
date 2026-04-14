# IA — Roadmap business Hedjav / EGP

> Dernière mise à jour : 2026-04-14
> Propriétaire : Hermann D. AVAHOUIN — KTALYZ SARL
> Document à garder à jour à chaque itération IA (prompt, provider, coût, impact).

Ce document recense ce qui existe déjà en IA dans `hedjav-web`, ce qui était
reporté faute de provider, et ce qu'il est pertinent de brancher maintenant que
DeepSeek est disponible via `.env`. L'ordre d'exécution est classé selon
l'impact business attendu, pas selon la facilité technique.

---

## A. État actuel de l'IA dans le projet

### Couche unifiée (lib/ai/client.ts)

- **Providers supportés** : DeepSeek (priorité auto), OpenAI, Anthropic.
- **Auto-détection** : prend la première clé disponible, sinon skip propre
  (`{ ok: false, skipped: true }` — aucun crash).
- **Sécurité** : aucune clé jamais loggée, sanitization des messages d'erreur,
  timeout 60 s, logs best-effort dans `ai_logs`.
- **Extensibilité** : ajout d'un provider = implémenter `ProviderCall` + entrée
  dans `DEFAULT_MODELS` et `providers`. Pas de refonte.

### Call sites IA actifs

| Route / module | Action | Statut | Saved to |
|---|---|---|---|
| `POST /api/admin/generate-article` | Brouillon d'article à partir d'un sujet | ✅ Live | `articles` |
| `POST /api/articles/score` | Score qualité 0–100 (5 critères) | ✅ Live | `articles.quality_score` |
| `POST /api/brvm/summarize` | Résumé séance BRVM quotidien + email admin | ✅ Live (legacy `brvm_data`) | `brvm_data.ai_summary` |
| `POST /api/brvm/weekly-digest` | Synthèse hebdo → brouillon article | ✅ Live (legacy `brvm_data`) | `articles` (draft) |
| `POST /api/brvm/alerts/digest` | **Nouveau** : digest publications BRVM + IA optionnelle | ✅ Live (multi-fréquence) | `brvm_alert_log` |
| `POST /api/newsletter/send` | Génération HTML newsletter hebdo | ✅ Live | (email direct, pas de DB) |
| `POST /api/campaigns/generate-email` | Génération email d'une campagne | ✅ Live | `campaign_emails.body_html` |
| `lib/brvm/article-generator.ts` | Article auto à partir de snapshot BRVM | ✅ Live (via trigger) | `articles` |

### Admin IA dashboard (`/admin/ia`)

- Compteurs : appels ce mois, tokens, taux de succès.
- Logs des 50 derniers appels.
- `/admin/ia/articles` et `/admin/ia/scoring` exposent déjà la génération et le scoring manuel.

---

## B. Chantiers IA déjà commencés

| Chantier | État | Reste à faire |
|---|---|---|
| Client unifié multi-provider | ✅ terminé (DeepSeek ajouté) | — |
| Scoring qualité articles | ✅ live | UI filtre par score, badges dans `/admin/articles` |
| Génération d'articles depuis sujet | ✅ live | Ajouter champ « angle », multi-variantes, A/B |
| Newsletter hebdo IA | ✅ live | Segmentation par tags, plusieurs angles par édition |
| Digest BRVM admin (multi-fréquence) | ✅ live | Seuils de déclenchement (ex : « alerte si ≥ 1 BOC ») |
| Synthèse hebdomadaire BRVM → article | ✅ live | Promotion draft → publié selon score |

---

## C. Chantiers IA reportés (à redémarrer maintenant)

| Chantier | Pourquoi reporté | Remise en route |
|---|---|---|
| Séquence de bienvenue IA (campagne) | Pas de clé IA en prod | **Immédiat** : `INTERNAL_API_TOKEN` + clé DeepSeek → `/api/campaigns/process` |
| Reformulation premium d'articles | Pas de clé IA | Ajouter endpoint `/api/articles/[id]/rewrite` (nouveau) |
| Titres A/B pour articles | Pas de clé IA | Ajouter endpoint `/api/articles/[id]/titles` (nouveau) |
| Résumé automatique en tête d'article blog | Pas de clé IA | Champ `articles.ai_summary` + rendu inline |
| Bullets de vente pour pages ebook | Pas de clé IA | Ajouter champ `ebooks.ai_bullets` jsonb + génération une fois à la création |
| FAQ de réassurance ebook | Pas de clé IA | Champ `ebooks.ai_faq` jsonb (5 Q/R) |

---

## D. Propositions IA immédiates (à implémenter tout de suite)

Impact business élevé, coût de dev faible, ROI immédiat.

### 1. Digest BRVM admin enrichi IA ⭐
- **Livré partiellement** (`/api/brvm/alerts/digest`) avec analyse IA optionnelle.
- **Prochaine étape** : prompt éditorial Hermann (à fournir) → intégrer dans ce
  fichier puis dans la route. L'architecture le supporte déjà (le prompt est
  dans le code, facile à éditer sans casser).

### 2. Auto-bullets + FAQ ebook ⭐
- À la création ou édition d'un ebook, un bouton « ✨ Générer bullets + FAQ »
  appelle l'IA et remplit `ebooks.ai_bullets` et `ebooks.ai_faq`.
- Prompt : extrait `title`, `description`, `target_audience` → demande 5 bullets
  orientés bénéfice + 5 Q/R d'objection.
- Rendu : injecté dans `/ebooks/[slug]` après le hero.

### 3. AI summary en tête d'article blog ⭐
- Champ `articles.ai_summary` (150–250 caractères).
- Généré à la publication d'un article.
- Rendu : encart doré « En 30 secondes » au-dessus du contenu.

### 4. Titres A/B pour campagnes et articles
- Endpoint `/api/articles/[id]/titles` qui retourne 5 variations.
- UI : boutons « Plus direct / Plus premium / Plus curiosité » dans l'éditeur.

### 5. Recommandation d'ebook dans emails post-achat
- Après paiement (`/api/webhooks/fedapay`), l'email de confirmation inclut une
  recommandation IA : "Vous avez acheté X, voici Y qui complète".
- Prompt : liste des ebooks disponibles + ebook acheté → recommande le plus
  adapté.

---

## E. Propositions IA moyen terme (1–2 mois)

### 1. Scoring pertinence des publications BRVM
- À l'insertion dans `brvm_documents`, calculer un score d'intérêt (0–100).
- Prompt : titre + émetteur + type + description → score + justification.
- Usage : pré-trier les digests, alerter en priorité les BOC à fort impact.

### 2. Transformer une veille BRVM en article publiable
- À partir d'un document indexé (rapport annuel, BOC), bouton « ✨ Rédiger un
  angle pédagogique ».
- Génère un draft avec structure HEDJAV (contexte UEMOA, leçon patrimoniale,
  appel à l'action).

### 3. Réactivation d'abonnés inactifs
- Trouver les abonnés qui n'ont pas ouvert depuis 60 jours.
- Générer un email personnalisé de réengagement (basé sur leur dernière
  interaction si tracking dispo).

### 4. Reformulation premium d'articles
- Après rédaction initiale, bouton « ✨ Rendre premium » qui réécrit en ton
  Hedjav + ajoute exemples concrets UEMOA.

### 5. Chatbot patrimoine (pré-bot d'accueil)
- Sur la homepage, widget qui répond aux 5 questions fréquentes (« Qu'est-ce
  que la BRVM ? », « Quel ebook pour moi ? »).
- Redirige vers newsletter ou ebook adapté.

---

## F. Propositions IA long terme (3–6 mois, réservé à la commercialisation)

### 1. Abonnement stratégique client (Phase 3 CDC)
- Analyse IA quotidienne personnalisée par profil utilisateur.
- Résumés adaptés (débutant / expert / investisseur actif).
- Email personnalisé quotidien.
- **Prérequis** : profils utilisateurs enrichis, tagging d'intérêts, paywall.

### 2. Version simplifiée pour non-experts
- Reformuler chaque article et chaque synthèse BRVM en version « première
  lecture » (niveau B1 français).
- Trigger : clic sur un bouton « Simplifier » dans l'article.

### 3. Recommandations de contenu selon profil
- Moteur RAG sur articles + ebooks.
- Reco après chaque lecture d'article.

### 4. Pré-rédaction de posts LinkedIn / Twitter à partir d'articles
- Pour la communication Hermann : à partir d'un article, générer 3 variantes
  sociales adaptées (pédagogique, punch, question).

### 5. Génération d'infographies (via DALL-E ou équivalent)
- Pas prioritaire tant que l'UEMOA ne consomme pas beaucoup de visuels IA,
  mais permettrait de produire des cartes WhatsApp partage.

---

## G. Quick wins business (à faire en une journée)

| Quick win | Effort | Impact | Qui |
|---|---|---|---|
| Activer DeepSeek dans `.env.local` prod | 2 min | Déblocage total | Hermann |
| Lancer 1er digest manuel depuis `/admin/brvm/alertes` | 5 min | Visibilité immédiate | Hermann |
| Régénérer les 6 ebooks avec bullets IA | 30 min (1 par 1) | Conversion +15 % attendue | Dev |
| Ajouter `ai_summary` aux 10 derniers articles | 20 min | Temps de lecture perçu ↓ | Dev |
| Activer `/api/campaigns/process` via cron | 10 min | Nurture post-inscription auto | Dev |

## H. Quick wins éditoriaux

- Utiliser le scoring qualité sur TOUS les articles existants (5 min).
- Filtrer les articles < 60/100 pour réécriture.
- Pour chaque nouvel article, demander 3 titres à l'IA, choisir le meilleur.

## I. Quick wins admin / productivité

- Dashboard IA déjà OK → ajouter card « Coût estimé ce mois » (simple multiplication
  tokens × prix DeepSeek).
- Alerte admin si un appel IA plante 3× d'affilée (via `admin_notifications`).
- Stats par action : quel prompt consomme le plus de tokens ?

## J. Axes monétisation future

1. **Abonnement stratégique** — 15 000 F CFA / mois, digest quotidien personnalisé.
2. **Rapport mensuel BRVM premium** — 10 000 F CFA / rapport, auto-généré à
   partir des digests + synthèse Hermann.
3. **API B2B** — sociétés de gestion, banques locales : accès aux digests via
   API tokenisée.

**Important** : ces offres ne doivent PAS être lancées tant que le noyau
(digests admin + contenu éditorial + tunnel de vente ebooks) n'est pas solide.

---

## K. Ordre d'exécution recommandé (ROI décroissant)

### Sprint 1 (cette semaine)
1. Renseigner `DEEPSEEK_API_KEY` en prod
2. Lancer le 1er digest hebdomadaire depuis `/admin/brvm/alertes`
3. Vérifier la qualité de l'analyse IA → itérer sur le prompt dans
   `app/api/brvm/alerts/digest/route.ts:90`
4. Configurer 3 crons cron-job.org (daily, weekly, monthly)

### Sprint 2 (semaine suivante)
5. Auto-bullets + FAQ ebooks
6. `ai_summary` article blog
7. Reco ebook dans email post-achat FedaPay

### Sprint 3 (J+3 semaines)
8. Titres A/B
9. Reformulation premium
10. Scoring pertinence des docs BRVM

### Sprint 4 (J+5 semaines)
11. Chatbot pré-accueil simple (5 FAQ)
12. Réactivation abonnés inactifs

### Backlog (Phase 3 CDC)
13. Abonnement stratégique client
14. Rapport mensuel premium
15. API B2B

---

## L. Risques et limites

- **Qualité DeepSeek** : à valider sur les sujets UEMOA spécifiques. Prévoir
  fallback Anthropic si résultats insuffisants.
- **Coût** : à surveiller via `ai_logs`. DeepSeek ≈ 10× moins cher qu'OpenAI,
  mais un digest quotidien × 30 jours × analyse 500 tokens = ~ nil. Pas de
  risque économique à court terme.
- **Français UEMOA** : DeepSeek est entraîné principalement sur l'anglais +
  chinois. Tester la qualité du français et du vocabulaire financier UEMOA.
  Si limite : Anthropic en fallback prioritaire pour le français.
- **Hallucinations sur chiffres** : ne JAMAIS laisser l'IA inventer un chiffre
  BRVM. Prompts toujours assortis de « reproduire les chiffres à l'identique ».
- **RGPD / confidentialité** : aucune donnée utilisateur sensible envoyée aux
  providers IA. Seuls titres, descriptions et snapshots marché transitent.
