# Politique de sécurité des sessions — Hedjav / EGP

> Avril 2026. Livré avec la branche `feature/iceberg-audit-fixes`.

---

## 1. Principe

Distinguer proprement deux niveaux :

- **Session auth Supabase** — refresh token géré par Supabase SSR (≈ 1 an par
  défaut). On ne la touche pas. C'est la base cryptographique.
- **Session applicative Hedjav** — "l'utilisateur est-il actif ?" Ce sont nos
  règles métier, pilotables via `.env.local`.

La politique porte uniquement sur la session applicative. La première reste
intacte pour ne pas casser le comportement Supabase standard.

---

## 2. Seuils par rôle

| Rôle | Seuil par défaut | Variable env | Signification |
|---|---|---|---|
| **Admin** | 30 minutes | `ADMIN_INACTIVITY_MIN` | Un admin inactif plus de 30 min est sign-out au prochain chargement |
| **Membre** | 7 jours | `MEMBER_INACTIVITY_DAYS` | Un membre inactif plus de 7 j est sign-out au prochain chargement |

Ratio volontaire d'environ **336x** (30 min vs 7 j × 24 × 60) : admin très
strict, membre souple pour ne pas couper leur accès aux ebooks achetés.

### Pourquoi 30 min admin ?
- Supervision BRVM + gestion clients = accès à des données sensibles
  (emails clients, achats, bio Hermann).
- Risque poste partagé ou oublié en déplacement.
- 30 min = équilibre confort / sécurité. Reconnexion rapide pour Hermann
  qui est le principal admin.

### Pourquoi 7 j membre ?
- Un membre lit ses ebooks sporadiquement, pas tous les jours.
- Aucune donnée bancaire n'est stockée côté client.
- Cookie Supabase déjà signé, risque faible sur 7 j.

### Personnalisation prod
Pour durcir : `ADMIN_INACTIVITY_MIN=15 MEMBER_INACTIVITY_DAYS=2`.
Pour relâcher en dev : `ADMIN_INACTIVITY_MIN=480` (8 h).

---

## 3. Architecture technique

```
┌──────────────────┐
│  Navigateur      │
│  InactivityMonitor│──── POST /api/auth/activity-touch ──┐
│  (click/scroll)  │     (throttle 2 min)               │
└──────────────────┘                                     │
                                                         ▼
┌──────────────────┐   met à jour    ┌───────────────────┐
│   proxy.ts       │ ◄─── profiles ──┤ Supabase (DB)     │
│   inactivity     │     last_visit  │ profiles.last_    │
│   check          │     _at         │ visit_at          │
└──────────────────┘                 └───────────────────┘
         │
         │ si inactif → redirect /login?expired=1
         │ + clear cookies sb-*
         ▼
┌──────────────────┐
│  /login?expired=1│
│  "Session expirée"│
└──────────────────┘
```

### Points clés

1. **`proxy.ts`** lit `profiles.role` + `profiles.last_visit_at` à chaque
   requête authentifiée. Si `Date.now() - last_visit_at > threshold` →
   redirect `/login?expired=1` + invalidation des cookies `sb-*`.

2. **`InactivityMonitor.tsx`** — composant mounté dans les layouts admin +
   dashboard. Ping `/api/auth/activity-touch` aux interactions utilisateur
   (click, scroll, keydown, focus fenêtre). Throttle à 2 min pour ne pas
   écraser Supabase.

3. **`touchLastVisit(userId)`** — utilitaire qui `UPDATE profiles SET last_visit_at = now()`.
   Déjà appelé côté dashboard, désormais aussi côté admin layout.

4. **`/api/auth/activity-touch`** — endpoint minimal qui appelle
   `touchLastVisit` pour l'utilisateur courant. Retourne 204 si non connecté.

5. **Page `/login?expired=1`** affiche un message explicite plutôt qu'un
   écran générique — l'utilisateur comprend pourquoi il a été déconnecté.

---

## 4. Comportements attendus

| Événement | Admin (30 min) | Membre (7 j) |
|---|---|---|
| Chargement d'une page | `last_visit_at ← now()` via `touchLastVisit` en layout | Idem |
| Clic / scroll / touche | `last_visit_at ← now()` via endpoint activity-touch (max 1×/2 min) | Idem |
| Retour sur l'onglet (focus) | `last_visit_at ← now()` (sans throttle) | Idem |
| Inactivité > seuil + requête | Redirect `/login?expired=1`, cookies `sb-*` vidés | Idem |
| Appel API depuis JS (ex: fetch /api/brvm/documents) | Cookie client valide → OK. Mais si le middleware match la route `/api/*` (il ne match pas par défaut, voir matcher proxy) | Idem |
| Reconnexion immédiate | Valide, `next` respecté | Idem |

---

## 5. Routes protégées

Le proxy applique l'inactivité sur :
- `/dashboard` et sous-routes
- `/admin` et sous-routes

Le proxy **n'applique pas** l'inactivité sur `/api/*` directement — les
endpoints sensibles valident eux-mêmes la session via
`createSupabaseServerClient()` puis `checkAdminSession()`. Cela évite un
kill-switch global qui casserait les callbacks (webhooks FedaPay, cron
externes avec Bearer token).

---

## 6. Cas particuliers

### Cron externes avec Bearer token
Non concernés. Ils n'ont pas de session utilisateur. Auth par header uniquement.

### Téléchargement d'ebook
`GET /api/ebooks/download?ebook_id=XXX` vérifie la purchase paid dans la DB.
Passe par le middleware (route `/api/ebooks/download` non exclue) — mais le
flux est rapide et se fait en URL signed Supabase Storage, donc le token
reste valide même si la session expire pendant le téléchargement d'un fichier
volumineux.

### Formulaires longs
Risque : admin rédige un article pendant 35 min, soumet, se fait kicker.
Mitigation V1 : `InactivityMonitor` pingue sur `keydown`. Tout clavier actif
repousse l'expiration. V2 possible : alerte browser modale à 80% du seuil
(25 min pour admin) avec bouton "Je suis là".

---

## 7. Impacts UX

| Persona | Ressenti |
|---|---|
| Hermann (admin) | Peut avoir à se reconnecter 1-2 fois par session d'édition. Message clair "Session expirée". |
| Membre courant | Invisible tant qu'il vient au moins 1 fois par semaine. |
| Membre rare | Reconnexion normale, pas de friction supplémentaire. |
| Visiteur non connecté | Rien ne change. |

---

## 8. Configuration recommandée selon l'environnement

### Dev local (`.env.local`)
```
ADMIN_INACTIVITY_MIN=480       # 8h, pour pas être coupé pendant qu'on code
MEMBER_INACTIVITY_DAYS=30      # 30j
```

### Staging
```
ADMIN_INACTIVITY_MIN=60        # 1h
MEMBER_INACTIVITY_DAYS=7
```

### Production (défaut)
```
ADMIN_INACTIVITY_MIN=30
MEMBER_INACTIVITY_DAYS=7
```

### Production durcie (recommandé si poste partagé)
```
ADMIN_INACTIVITY_MIN=15
MEMBER_INACTIVITY_DAYS=3
```

---

## 9. Points de vigilance

- **Ne pas confondre avec timeout cookie** : Supabase refresh token reste à 1 an.
  On ne change pas la durée des cookies, on ajoute une couche applicative.
- **`last_visit_at` en base** : si on migre un utilisateur avec
  `last_visit_at = NULL` (profil legacy), l'inactivité n'est **pas** appliquée
  (on considère la session active par défaut). Cela évite de kicker massivement
  au déploiement. Au premier ping post-déploiement, le champ se remplit.
- **RLS** : `profiles.last_visit_at` est mis à jour par service-role uniquement
  (la fonction `touchLastVisit` utilise `SUPABASE_SERVICE_ROLE_KEY`).
- **Notifs d'expiration par email** : non implémentées en V1. On considère
  que la reconnexion instantanée dans le même navigateur est suffisante.
