# Recette métier — hedjav.com (EGP)

> Scénarios concrets pour valider que l'application est prête à être exploitée au quotidien.  
> Chaque parcours décrit : **qui fait quoi, où, et ce qui doit se passer**.

---

## Pré-requis d'exécution

Avant de dérouler la recette :

1. Migrations SQL appliquées jusqu'à `024_content_exploitation.sql` inclus
2. Seeds exécutés dans l'ordre :
   ```bash
   node scripts/seed-pages.mjs
   node scripts/seed-ebooks.mjs
   node scripts/seed-articles.mjs
   node scripts/seed-first-campaign.mjs
   ```
3. Un admin existant (bootstrap via `scripts/promote-admin.mjs <email>`)
4. Variables d'environnement dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `INTERNAL_API_TOKEN`
   - `SMTP_*` (sinon fallback console.log)
   - `OPENAI_API_KEY` **ou** `ANTHROPIC_API_KEY` (sinon IA en mode skipped)
   - `FEDAPAY_API_KEY`, `FEDAPAY_WEBHOOK_SECRET`
5. `npm run dev` démarré sur `http://localhost:3000`

---

## Scénario 1 — Un visiteur découvre Hedjav

**Profil** : cadre béninois, 35 ans, a entendu parler d'EGP via WhatsApp.

1. Il arrive sur `/` (page d'accueil).
2. Il voit :
   - Hero "L'école en ligne de la gestion de patrimoine" avec sous-titre "Pour l'Afrique francophone"
   - 4 badges de réassurance (13 ans d'expérience, expert BRVM, UEMOA/OHADA, communauté)
   - Section "Notre approche" : 3 piliers (Apprendre / Investir / Transmettre)
   - Teaser des 3 ebooks vedettes
   - Teaser des 3 articles vedettes
   - Bloc fondateur avec photo, bio 13 ans d'expérience, 4 bullet points
   - CTA newsletter et CTA final
3. Il clique sur un ebook vedette → `/ebooks/[slug]`.
4. Il lit : promesse, à qui ça s'adresse, ce qu'il va obtenir, features, prix, réassurance (FedaPay, livraison instant, facture KTALYZ).

**Critère de validation** :
- ✅ Aucun texte de démo type "Lorem ipsum"
- ✅ Toutes les références à l'école mentionnent **EGP**
- ✅ Tous les textes sur le fondateur mentionnent **13 ans d'expérience**
- ✅ Aucune mention de LinkedIn nulle part
- ✅ Marque **Hedjav** visible dans le header/footer/meta

---

## Scénario 2 — Il s'inscrit à la newsletter

1. Sur la page d'accueil, il entre son email dans la section newsletter et clique "S'inscrire".
2. Le formulaire valide l'email côté client, puis fait `POST /api/newsletter/subscribe`.
3. Message visible : "Inscription confirmée" (ou équivalent serveur).
4. Côté backend :
   - Rate limit vérifié (5/min par IP)
   - Email normalisé (Gmail dots, +tags)
   - Ligne insérée dans `newsletter_subscribers` avec `source='home'`, `subscriber_type='editorial'`, `is_active=true`
   - Email de confirmation envoyé (template `newsletterSubscribedEmail`) via SMTP Hostinger
   - Notification admin créée (type `newsletter`, priority `normal`)
   - Si l'abonné matche la campagne "Bienvenue Hedjav" active (tags `newsletter` ou `editorial`), enroll automatique (`enrolled_campaign_id`, `campaign_step=0`)

**Critère de validation** :
- ✅ Entrée visible dans Supabase → `newsletter_subscribers`
- ✅ Notification visible dans `/admin/notifications`
- ✅ Email reçu (ou log dans la console si SMTP non configuré)

---

## Scénario 3 — Il reçoit le lead magnet (pop-up exit intent)

1. Le visiteur navigue quelques secondes ou scroll > 60 %.
2. Le `LeadMagnetPopup` apparaît (si config active via `/admin/popup`).
3. Il remplit prénom + email + téléphone (facultatif) et clique "Je télécharge l'extrait".
4. `POST /api/popup/send-lead-magnet` déclenche :
   - Insertion dans `newsletter_subscribers` avec `subscriber_type='lead_magnet'`
   - Email envoyé avec lien vers `ebook.lead_magnet_url`
   - Incrément `popup_config.stats_submitted`
   - Cookie `hedjav_popup_subscribed` posé (365 j)

**Critère de validation** :
- ✅ Email avec lien de téléchargement reçu
- ✅ Le pop-up ne réapparaît plus pendant 365 jours sur le même navigateur
- ✅ Stats visibles dans `/admin/popup`

---

## Scénario 4 — Il consulte un article

1. Il clique sur un article vedette → `/blog/ouvrir-compte-titres-brvm-2026`.
2. La page affiche : breadcrumb, titre, date/auteur/temps de lecture, cover, corps markdown.
3. En bas : bloc "Envie d'aller plus loin ?" qui pousse vers l'ebook associé.
4. Sur la droite (ou inline mobile) : `InlineNewsletterCTA` pour capter l'email.
5. Section "Articles liés" (`RelatedArticles`) affiche 2-3 articles de la même catégorie.

**Critère de validation** :
- ✅ Temps de lecture calculé automatiquement (~200 mots/min)
- ✅ Le markdown rend correctement (sanitize via `rehypeSanitize`)
- ✅ JSON-LD présent dans le `<head>` (vérifier via "view source")

---

## Scénario 5 — Il achète un ebook

1. Sur `/ebooks/propulser-ia`, il clique **Acheter maintenant**.
2. **Non connecté** → `BuyButton` affiche "Se connecter pour acheter" → redirect `/login?next=/ebooks/propulser-ia`.
3. Il s'inscrit (`/register`) avec email, mot de passe (min 8 chars, 1 maj, 1 chiffre), prénom, pays UEMOA.
4. Email de bienvenue reçu (`welcomeEmail`). Notification admin "Nouveau membre" créée.
5. Il revient sur l'ebook et clique **Acheter maintenant** (connecté cette fois).
6. `POST /api/purchases/create` :
   - Rate limit (3/min par IP)
   - Vérifie pas déjà acheté (sinon 409)
   - Nettoie pending > 30 min
   - Crée transaction FedaPay via SDK serveur
   - Retourne `payment_url`
7. Il est redirigé vers FedaPay (Wave / Orange Money / MTN MoMo / carte).
8. Paiement effectué → FedaPay appelle `POST /api/webhooks/fedapay` :
   - Vérifie la transaction via API FedaPay (défense en profondeur)
   - Update `purchases.status = 'paid'`, `payment_method`, `raw_payload`
   - Email de confirmation envoyé (`purchaseConfirmationEmail`)
   - Notification admin "Nouvelle vente" créée (priority `high`, trigger PG)
   - Appel async `POST /api/invoices/generate` → facture PDF créée + uploadée
9. Il est redirigé vers `/merci?ref=...`.
10. La page `/merci` affiche **Merci pour votre confiance** (paid) ou **Vérification en cours** (pending avec auto-refresh 5s × 24).

**Critère de validation** :
- ✅ Ligne `purchases` en `status=paid` avec `payment_ref`
- ✅ Ligne `invoices` avec `pdf_url` valide
- ✅ Emails : welcome + confirmation reçus
- ✅ Notification admin visible dans `/admin/notifications` avec priority `high`
- ✅ Vente visible dans `/admin/ventes`

---

## Scénario 6 — Il retrouve son ebook dans son dashboard

1. Il va sur `/dashboard` → stats (profile %, ebooks, badge membre, ancienneté).
2. Section "Ma bibliothèque" affiche son nouvel ebook.
3. Il clique sur **Mes ebooks** dans le subnav → `/dashboard/mes-ebooks`.
4. Il voit : carte `PurchasedEbookCard` avec bouton **Télécharger** + lien **Facture PDF**.
5. Il clique **Télécharger** → `GET /api/ebooks/download?ebook_id=...` :
   - Vérifie session user
   - Vérifie purchase `status=paid` (user_id OU email match)
   - Génère signed URL 5 min (bucket privé `ebook-files`)
   - Redirect 302 vers l'URL signée
6. Le navigateur télécharge le PDF.

**Critère de validation** :
- ✅ PDF téléchargé correspond bien à l'ebook acheté
- ✅ Facture PDF consultable
- ✅ Tous les messages d'état vide (dashboard, mes-commandes, alertes) sont chaleureux et invitent à l'action

---

## Scénario 7 — L'admin voit l'achat

1. L'admin se connecte sur `/login`, proxy redirige vers `/dashboard`, il va sur `/admin`.
2. Dashboard admin :
   - Stats cards : CA total, CA mois, nouveaux membres, abonnés newsletter
   - Graphique revenue 12 mois (Recharts)
   - Top ebooks (leaderboard)
   - Activité récente (dernier achat visible en tête)
3. Il clique sur **Ventes** → liste des dernières transactions avec CSV export.
4. Il clique sur **Clients** → voit la fiche du nouvel acheteur (nom, pays, achats, CA cumulé).
5. Il clique sur **Notifications** dans la cloche (header) → voit la notification "Nouvelle vente : [ebook] - [montant] FCFA".

**Critère de validation** :
- ✅ Achat visible en < 30 secondes après confirmation webhook
- ✅ Facture PDF accessible depuis la liste des factures
- ✅ Admin peut marquer la notification "lue"

---

## Scénario 8 — L'admin lance une veille BRVM

1. Admin va sur `/admin/brvm`.
2. Voit : 4 stat cards (nouveaux BOC jour/7j, total indexé, non traités).
3. Clique sur **Lancer un scrape** (`BRVMTriggerButton`) → `POST /api/admin/brvm-trigger` → proxy vers `/api/brvm/scrape` (Bearer `INTERNAL_API_TOKEN`).
4. Le scrape parcourt :
   - Sikafinance (cours, indices, résumé séance)
   - brvm.org (BOC 3 pages, rapports sociétés, 8 catégories d'annonces)
5. Dédup via checksum SHA256 (même doc 2× = 1 ligne).
6. Nouveaux documents insérés → trigger PG crée automatiquement une notification admin (priority `high` pour BOC).
7. Admin voit la liste mise à jour avec badge "Nouveau" sur les documents non traités.

**Critère de validation** :
- ✅ `/api/brvm/maintenance` remonte `overall_status: 'ok'`
- ✅ Les 3 sources (brvm-org, bfin, sikafinance) sont listées avec `last_scraped_at` récent
- ✅ Nouveaux documents visibles dans `brvm_documents` avec `is_new=true`
- ✅ Notification admin créée

---

## Scénario 9 — L'admin consulte les documents et les télécharge

1. Depuis `/admin/brvm`, admin clique sur un BOC → détails (titre, date, source, URL).
2. Va sur `/admin/brvm/downloader`, sélectionne :
   - Date range
   - Type de documents (checkbox BOC, rapports, annonces)
3. Clique **Télécharger la période** → `POST /api/brvm/download` :
   - Liste les documents correspondants
   - Télécharge chaque PDF (séquentiel, avec délai anti-flood)
   - Upload dans bucket privé `brvm-documents` (chemin `{doc_type}/{YYYY}/{YYYY-MM-DD}_{checksum8}.pdf`)
   - Met à jour `metadata.storage_path`
4. Le report revient avec counters : `downloaded`, `skipped_already_archived`, `failed`.
5. Admin peut cliquer sur l'icône 📎 d'un doc archivé → `GET /api/brvm/download?document_id=...` → signed URL 5 min.

**Critère de validation** :
- ✅ PDFs effectivement présents dans bucket Supabase Storage
- ✅ Re-run idempotent : tous les docs déjà archivés sont skipped
- ✅ Signed URL valide (téléchargement possible pendant 5 min)

---

## Scénario 10 — L'admin génère un article BRVM via IA

1. Sur `/admin/ia/articles`, admin saisit :
   - Sujet : "BRVM — clôture de la semaine du XX au YY"
   - Catégorie : "BRVM"
   - Instructions : optionnel
2. Clique **Générer**.
3. `POST /api/admin/generate-article` :
   - Vérifie session admin
   - Si `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` disponible → `generateText` via `lib/ai/client.ts`
   - Sinon → retourne `{ ok: false, skipped: true }` avec status 503
4. Article inséré en `source='ai'`, `is_published=false`, `created_by='admin-generator'`.
5. Log IA écrit dans `ai_logs` (provider, model, tokens, durée).
6. Admin est redirigé vers `/admin/articles/[id]` où il relit, retouche, publie.

**Critère de validation** :
- ✅ Si aucun provider : message clair "IA non configurée" (pas de crash)
- ✅ Article généré cohérent, en français, avec titre et excerpt
- ✅ Entrée visible dans `/admin/ia` (logs)

---

## Scénario 11 — L'admin génère le digest BRVM hebdomadaire

1. Admin (ou cron) appelle `POST /api/brvm/weekly-digest` avec Bearer `INTERNAL_API_TOKEN`.
2. Le système :
   - Requête les données de la semaine passée (`brvm_data` 7 derniers jours)
   - Construit un prompt avec résumés, indices, annonces, BOC
   - `generateText({ action: 'brvm_weekly_digest', maxTokens: 3000 })`
   - Si IA OK → crée article brouillon (category=`BRVM`, is_published=false)
   - Sinon → fallback article minimal avec tableau des données
   - Envoie email aux admins avec lien vers l'article
   - Crée notification admin

**Critère de validation** :
- ✅ Article visible dans `/admin/articles` avec badge "IA"
- ✅ Email reçu avec lien `/admin/articles/[id]`
- ✅ Notification "Synthèse BRVM hebdo" créée

---

## Scénario 12 — L'admin active la campagne de bienvenue

1. Va sur `/admin/campagnes` → voit "Bienvenue Hedjav" en statut `draft`.
2. Clique dessus → `/admin/campagnes/[id]`.
3. Pour chaque email (5 au total), clique **Générer** → `POST /api/campaigns/generate-email`.
4. Relit le contenu généré, ajuste si besoin via `CampaignEditForm`.
5. Passe le statut en `active` (bouton `CampaignStatusButton`).
6. Ensuite, cron quotidien → `POST /api/campaigns/process` :
   - Pour chaque abonné `newsletter` actif non encore enrollé, déclenche email #1 (delay 0)
   - Pour ceux déjà enrollés, vérifie si le délai du prochain email est écoulé
   - Respect du cap hebdo (3 emails max par abonné par semaine)
   - Envoie via SMTP, met à jour `campaign_sends.status`, avance `campaign_step`

**Critère de validation** :
- ✅ Les 5 emails générés sont en français, cohérents avec la ligne éditoriale (13 ans, EGP, Hedjav)
- ✅ Pas de LinkedIn mentionné
- ✅ Les tests `POST /api/campaigns/process` envoient effectivement à un compte test

---

## Ordre de recette suggéré

| # | Scénario | Durée estimée |
|---|----------|---------------|
| 1 | Découverte visiteur | 5 min |
| 2 | Inscription newsletter | 3 min |
| 3 | Lead magnet | 5 min |
| 4 | Article | 5 min |
| 5 | Achat ebook complet | 15 min |
| 6 | Retrouver ebook (dashboard) | 5 min |
| 7 | Admin voit achat | 5 min |
| 8 | Lancer scrape BRVM | 10 min |
| 9 | Download PDFs | 5 min |
| 10 | Génération article IA | 5 min |
| 11 | Digest hebdo | 5 min |
| 12 | Activer campagne | 15 min |

**Total : ~1h30 de recette complète.**

---

## Points d'attention / bloqueurs potentiels

| Bloqueur | Solution |
|----------|----------|
| FedaPay refuse la transaction en mode `live` | Utiliser des clés test `sk_test_*` pendant la recette |
| SMTP Hostinger ne délivre pas | Vérifier SPF/DKIM du domaine `egp.hedjav.com`, fallback console.log |
| `OPENAI_API_KEY` absent → IA skipped | Soit activer Anthropic, soit accepter mode dégradé contrôlé (status 503 documenté) |
| Scrape brvm.org échoue | Vérifier `/api/brvm/maintenance`, SSL contourné côté client undici |
| Worktree sans `.env.local` | `cp .env.local .claude/worktrees/<nom>/.env.local` |

---

*Document généré dans le cadre de la phase d'exploitation du projet hedjav-web.*
