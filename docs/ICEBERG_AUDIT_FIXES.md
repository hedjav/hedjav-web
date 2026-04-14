# Audit iceberg — causes profondes et correctifs

> Branche : `feature/iceberg-audit-fixes` · Avril 2026.
> Fait suite à la PR #69 (Centre de Veille BRVM + DeepSeek).

Ce document trace les causes structurelles derrière les symptômes visibles
remontés en production, et les correctifs appliqués. Il sert à éviter de
rerégler les mêmes bugs en surface.

---

## 1. Liens email pointant vers localhost

### Symptôme
Dans certains emails (confirmation achat, reset mot de passe, inscription),
les liens cliquables pointaient vers `http://localhost:3000/...`.

### Cause immédiate
Plusieurs fichiers de code utilisaient des fallback locaux :

```ts
const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
```

### Cause structurelle
**Pas de helper canonique d'URL.** Chaque call-site dupliquait la logique de
fallback. Quand la variable n'était pas injectée au moment du build (cas
PM2 sans recharger l'env), le fallback localhost passait silencieusement.

### Impact
- Taux de clic email nul sur les liens ancrés en localhost.
- Perte de leads (newsletter → site).
- Abandons post-achat (lien ebook cassé).

### Correctif
- Nouveau `lib/url.ts` — source unique : `siteUrl(path)`, `siteBase()`.
- Fallback prod = `https://egp.hedjav.com`. **Plus jamais** localhost.
- Tous les call-sites critiques migrés : `lib/auth/actions.ts`,
  `app/api/admin/brvm-trigger`, `app/api/webhooks/fedapay`,
  `app/api/track/click`, `app/api/campaigns/process`,
  `app/api/brvm/weekly-digest`, `lib/email/templates.ts`.

### Vérification post-déploiement
1. Envoyer un email test (inscription, reset password).
2. Inspecter chaque lien `<a href>` dans la source HTML.
3. Tous doivent commencer par `https://egp.hedjav.com`.

---

## 2. Notifications internes retombant sur `/admin`

### Symptôme
Clic sur une notification (bell dropdown ou `/admin/notifications`) → toujours
redirection vers `/admin` au lieu de l'entité concernée.

### Cause immédiate
Fonction `typeLink(type)` hardcodée qui ignorait totalement `metadata`.

### Cause structurelle
Le modèle `admin_notifications` stockait `metadata jsonb` (avec `document_id`,
`purchase_id`, `profile_id`…), mais :
1. Aucune colonne `target_url` pour matérialiser la destination.
2. Les triggers SQL remplissaient `metadata` mais rien ne l'utilisait côté front.
3. Pas de mapping centralisé `type → URL` — la règle vivait en double (dropdown
   et table), avec des divergences silencieuses.

### Impact
Inefficacité admin : chaque notif nécessitait 3-4 clics pour atteindre la
bonne page. Notifications vues comme du bruit.

### Correctif (iceberg)
- Migration 026 ajoute `admin_notifications.target_url`, `entity_type`, `entity_id`.
- Trigger `notify_new_brvm_document` réécrit pour remplir ces champs.
- Backfill des notifs existantes via `update ... set target_url = case ...` dans la migration.
- Helper unique `lib/notifications/target-url.ts` :
  `resolveNotificationTarget(n)`, `notificationIcon(type)`,
  `notificationColor(type)`, `notificationTypeLabel(type)`.
- `createNotification()` remplit automatiquement `target_url` via le helper
  si l'appelant ne l'a pas forcé.
- Bell dropdown (`AdminNotifications.tsx`) et table (`NotificationsTable.tsx`)
  utilisent maintenant `resolveNotificationTarget(n)`.

### Conséquences sur le modèle
Chaque notif a désormais :
type · titre · message · priorité · is_read · metadata ·
**target_url** · **entity_type** · **entity_id** · date.

---

## 3. Sessions qui n'expiraient jamais

### Symptôme
Un admin qui quittait son navigateur restait connecté pendant des semaines.
Risque majeur sur un poste partagé.

### Cause immédiate
`proxy.ts` ne vérifiait que la présence du user Supabase, pas son activité.

### Cause structurelle
Deux concepts confondus :
- **Session auth Supabase** (refresh token ≈ 1 an par défaut)
- **Session applicative** (critère business : "utilisateur actif ?")

Personne n'implémentait la seconde. Aucune distinction admin / membre.
Aucun pilotage par variable d'environnement.

### Impact
- Compromission potentielle de données patrimoniales sensibles.
- Risque réglementaire / confiance client.
- Impossibilité de clore proprement des sessions admin partagées.

### Correctif
- Nouveau `lib/auth/inactivity.ts` — seuils configurables via env :
  - `ADMIN_INACTIVITY_MIN` (défaut 30 min)
  - `MEMBER_INACTIVITY_DAYS` (défaut 7 jours)
- `proxy.ts` lit `profiles.last_visit_at` et force sign-out si dépassement.
- `/api/auth/activity-touch` rafraîchit `last_visit_at` à chaque action.
- Composant `InactivityMonitor` (monté dans layouts admin + dashboard) ping
  l'endpoint aux interactions utilisateur (throttle 2 min).
- Layout admin applique aussi `touchLastVisit` au render (parité avec dashboard).
- Page login affiche un message « Session expirée » quand `?expired=1`.

Voir `docs/SESSION_SECURITY_POLICY.md` pour la politique complète.

---

## 4. Crons échoués et documentation contradictoire

### Symptôme
- `BRVM Daily` → 404 (route supprimée)
- `BRVM Reports Scan` → 404
- `Sitemap Ping` → Google ne maintient plus l'endpoint
- Double documentation (`CRON_SETUP.md` + `ACTIONS_MANUELLES.md`) avec fréquences divergentes

### Cause structurelle
Après chaque refonte (scrape orchestrateur, digests), la doc cron n'était pas
systématiquement mise à jour. L'existence de deux fichiers docs alimentait la
divergence.

### Correctif
- Fusion `CRON_SETUP.md` + `ACTIONS_MANUELLES.md` → un seul `CRON_SETUP.md`.
- Suppression des jobs obsolètes :
  - `Sitemap Ping` retiré (endpoint Google déprécié).
  - `Scoring Articles` passé en manuel uniquement.
  - `BRVM Daily`, `BRVM Reports Scan` déjà couverts par `/scrape/async`.
- Alignement des URLs restants vers la nouvelle architecture.
- Ajout explicite des 3 digests BRVM (daily/weekly/monthly).
- Ajout du cron supervision (`/api/brvm/maintenance` 30 min).

---

## 5. Logs IA peu exploitables

### Symptôme
`/admin/ia` affichait une simple table brute (date, action, prompt, status,
tokens, durée). Pas de filtre, pas de regroupement, pas de détail erreur.

### Cause structurelle
- CHECK SQL limité à `success | error` (pas de `skipped` ni `warning`).
- UI traitait chaque appel comme une ligne isolée, sans vue par action.
- Pas de distinction provider vs modèle (tout en `provider:model`).

### Correctif
- Migration 026 étend le CHECK : `success | error | skipped | warning`.
- UI `/admin/ia` refondue :
  - 6 KPIs (appels, succès, skipped, erreurs, tokens, latence moyenne).
  - Filtres : statut, action métier, recherche.
  - Regroupement par action avec compteurs par statut.
  - Détail expansible par ligne (prompt, résultat, erreur, metadata).
  - Séparation visuelle claire provider / modèle.
- Indexes `idx_ai_logs_action_created` et `idx_ai_logs_status_created`.

---

## 6. Maintenance BRVM sans valeur opérationnelle

### Symptôme
La page `/admin/brvm/maintenance` affichait un rapport riche mais n'agissait
pas : admin devait se souvenir de venir lire.

### Correctif
Décision produit : **garder comme supervision active**, pas diagnostic froid.
La route `/api/brvm/maintenance` crée automatiquement une notification admin
(`type=brvm_alert`) quand `overall_status` passe à warning/critical.

Dédup : une seule notif par niveau toutes les 6 h (évite le spam cron 30 min).
La notif porte `target_url=/admin/brvm/maintenance` + `priority=urgent/high`.

Résultat : le cron 30 min fait remonter les incidents sans intervention.

---

## 7. Centre BRVM trop technique

### Symptôme
Page `/admin/brvm` traitait les documents comme un flux unique. Pas de
navigation par société, secteur, indice. Le BOC avait un onglet autonome qui
mangeait l'espace des autres catégories.

### Cause structurelle
L'UI reflétait la structure DB (table plate) au lieu de la logique éditoriale
de l'admin (je veux voir tout ce qui concerne Sonatel / banques / BRVM 30).

### Correctif
Refonte produit du `BrvmHubPanel` :
- 5 onglets éditoriaux : **Toutes les nouveautés**, **Par société**, **Par secteur**,
  **Par indice**, **Archives**.
- BOC n'est plus un onglet — reste un filtre parmi les catégories.
- Migration 026 ajoute des index pour supporter les filtres sector / market_index /
  issuer_slug combinés à `discovered_at`.
- Badge de type stable (plus d'artefact visuel au refresh : `display: inline-block`,
  `min-width`, `white-space: nowrap`).

Voir `docs/BRVM_PRODUCT_REDESIGN.md` pour le détail des choix UX.

---

## 8. Alertes email BRVM : fréquence unique

### Symptôme
UI obligeait à choisir **une** fréquence (daily OR weekly OR monthly).
Hermann voulait que les trois soient actives et cumulables.

### Correctif
- UI multi-checkbox : les 3 fréquences sont cochées par défaut.
- Envoi séquentiel : un clic `Envoyer` enchaîne les 3 digests sélectionnés.
- Persistance via `admin_settings.brvm_alert_frequencies` (migration 026).
- Affichage résultat par fréquence (chaque envoi a sa carte).
- Tous les liens email passent maintenant par `siteUrl()` — plus jamais localhost.

---

## 9. Textes publics : 13 ans d'expérience

### Cause
Historique : la bio publique mentionnait 17 ans. Hermann a aligné à 13 ans
dans toutes les communications. Les textes code ne suivaient pas.

### Correctif
- Migration 026 : `UPDATE site_config SET value = replace(value, '17 ans', '13 ans') …`.
- Fallback `FounderBlock.tsx` et `a-propos/page.tsx` : 17 → 13.
- `scripts/seed-pages.mjs` aligné.
- CLAUDE.md fixe la règle : **13 ans partout**, jamais LinkedIn.

---

## 10. Risques évités

| Risque | Évité par |
|---|---|
| Fuite de liens localhost en prod → perte client | Helper canonique + grep des fallback |
| Admin permanent après fermeture navigateur | Inactivité 30 min + sign-out forcé |
| Notifications ignorées (retombent toutes sur /admin) | Mapping metadata + backfill SQL |
| Cron cassé sans alerte | Supervision `/api/brvm/maintenance` qui notifie auto |
| Documentation cron contradictoire | Fusion + nettoyage + tableau unique |
| Textes public obsolètes 17 ans | UPDATE site_config + fallback fichiers |

---

## 11. Points restant à affiner (hors scope PR)

- **Sentry / Slack webhook** sur supervision critique (aujourd'hui : seulement
  notification admin interne).
- **Enrichissement automatique secteur/indice** sur les documents BRVM
  existants (à coupler avec un prompt DeepSeek quand les clés sont live).
- **Taxonomie des issuers** : base de référence des sociétés cotées UEMOA
  avec mapping `issuer_slug → secteur/indice`, pour peupler les nouvelles
  colonnes `sector` et `market_index` sans repasser par l'IA.
- **Paywall alertes client** : pour l'instant les 3 digests sont admin-only.
  Monétisation (abonnement stratégique) viendra ensuite.
