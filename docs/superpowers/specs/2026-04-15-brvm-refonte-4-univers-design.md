# BRVM — Refonte 4 univers — Spec design

> Branche cible : `feature/brvm-refonte-4-univers`
> Date : 2026-04-15
> Maître d'œuvre : KTALYZ SARL / Hermann AVAHOUIN
> Objectif : transformer le « Centre de Veille BRVM » trop centré BOC en un hub
> structuré autour de 4 univers fidèles à la logique métier BRVM / RichBourse.

---

## 1. Principes directeurs

1. **4 univers égaux** : Marché · Rapports sociétés · Annonces émetteurs · Publications.
2. **Hiérarchie société → type → documents** matérialisée par la table `brvm_emetteurs`.
3. **Tri décroissant partout**, verrouillé dans les helpers (`lib/brvm/documents.ts`, `lib/brvm/market.ts`).
4. **BOC important mais non dominant** : une sous-catégorie parmi d'autres dans Publications.
5. **Migrations additives non destructives** : `brvm_data` legacy reste en place comme fallback, les CHECK constraints sont élargis pas remplacés.
6. **Liens prod = `https://egp.hedjav.com`** partout, jamais localhost.
7. **Lecture agréable** : navy `--n900` + cream `--cream` + or `--g500`, typo Cormorant Garamond pour titres, DM Sans pour corps, DM Mono pour données. Tableaux aérés, badges sobres, pas d'artefacts.

## 2. Modèle de données (nouvelles migrations)

### 2.1 `027_brvm_emetteurs.sql` — Référentiel sociétés

```sql
create table brvm_emetteurs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  ticker      text,
  name        text not null,
  full_name   text,
  isin        text,
  country     text,
  sector      text,
  market      text check (market in ('actions','obligations')),
  indices     text[] default '{}',
  aliases     text[] default '{}',     -- variations de noms pour rattachement auto
  is_active   boolean default true,
  logo_url    text,
  source_url  text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index idx_emetteurs_sector on brvm_emetteurs(sector);
create index idx_emetteurs_market on brvm_emetteurs(market);
create index idx_emetteurs_active on brvm_emetteurs(is_active);
-- RLS : admin only ; service-role bypass
```

### 2.2 `028_brvm_doc_taxonomy.sql` — `doc_family` + `doc_subtype`

```sql
alter table brvm_documents
  add column doc_family text check (doc_family in ('market','report','announcement','publication')),
  add column doc_subtype text,
  add column emetteur_id uuid references brvm_emetteurs(id) on delete set null;

-- backfill depuis doc_type existant
update brvm_documents set
  doc_family = case doc_type
    when 'boc' then 'publication'
    when 'rapport_annuel' then 'report'
    when 'rapport_trimestriel' then 'report'
    when 'rapport_semestriel' then 'report'
    when 'communique' then 'announcement'
    when 'annonce' then 'announcement'
    when 'note_information' then 'announcement'
    when 'avis' then 'publication'
    else 'publication'
  end,
  doc_subtype = doc_type;

create index idx_docs_family_date on brvm_documents(doc_family, doc_date desc);
create index idx_docs_subtype_date on brvm_documents(doc_subtype, doc_date desc);
create index idx_docs_emetteur on brvm_documents(emetteur_id);
```

**Taxonomie cible** :

| Famille | Subtypes |
|---|---|
| `report` | `rapport_annuel`, `rapport_semestriel`, `rapport_trimestriel`, `etats_financiers`, `commentaire_activite` |
| `announcement` | `convocation_ag`, `projet_resolution`, `notation_financiere`, `esv`, `communique`, `changement_dirigeant`, `franchissement_seuil`, `information_permanente` |
| `publication` | `boc`, `bulletin_mensuel`, `statistique_trimestrielle`, `annee_boursiere`, `avis`, `donnee_economique`, `valeur_liquidative` |
| `market` | (pas de PDF — données dans tables dédiées) |

### 2.3 `029_brvm_market_timeseries.sql` — Séries temporelles marché

```sql
create table brvm_market_snapshots (
  id                        uuid primary key default gen_random_uuid(),
  snapshot_date             date not null,
  source_id                 uuid references brvm_sources(id),
  valeur_transactions_fcfa  numeric,
  capi_actions_fcfa         numeric,
  capi_obligations_fcfa     numeric,
  nb_titres_echanges        integer,
  nb_transactions           integer,
  raw                       jsonb default '{}',
  created_at                timestamptz default now(),
  unique(snapshot_date, source_id)
);
create index idx_snapshots_date on brvm_market_snapshots(snapshot_date desc);

create table brvm_market_ticks (
  id             uuid primary key default gen_random_uuid(),
  emetteur_id    uuid references brvm_emetteurs(id) on delete cascade,
  tick_date      date not null,
  market         text check (market in ('actions','obligations')) not null,
  open           numeric,
  high           numeric,
  low            numeric,
  close          numeric,
  previous_close numeric,
  variation_pct  numeric,
  volume         bigint,
  value_fcfa     numeric,
  raw            jsonb default '{}',
  created_at     timestamptz default now(),
  unique(emetteur_id, tick_date, market)
);
create index idx_ticks_date on brvm_market_ticks(tick_date desc);
create index idx_ticks_emetteur_date on brvm_market_ticks(emetteur_id, tick_date desc);

create table brvm_indices_ticks (
  id             uuid primary key default gen_random_uuid(),
  index_code     text not null,
  tick_date      date not null,
  value          numeric not null,
  variation_pct  numeric,
  ytd_pct        numeric,
  raw            jsonb default '{}',
  created_at     timestamptz default now(),
  unique(index_code, tick_date)
);
create index idx_indices_date on brvm_indices_ticks(tick_date desc);
create index idx_indices_code_date on brvm_indices_ticks(index_code, tick_date desc);
```

Toutes admin-only via RLS, service-role bypass.

## 3. Architecture scrapers

```
lib/brvm/scrapers/
├── brvm-org.ts              (conservé, étendu)
├── emetteurs.ts             NEW — liste sociétés cotées
├── emetteur-detail.ts       NEW — page société + rapports par type
├── marche/
│   ├── resume.ts            NEW
│   ├── cours-actions.ts     NEW
│   ├── cours-obligations.ts NEW
│   └── indices.ts           NEW
├── annonces/
│   ├── convocations-ag.ts
│   ├── projets-resolution.ts
│   ├── notations.ts
│   ├── esv.ts
│   ├── communiques.ts
│   ├── changements-dirigeants.ts
│   ├── franchissements-seuil.ts
│   └── informations-permanentes.ts
└── publications/
    ├── boc.ts               (conservé)
    ├── bulletins-mensuels.ts
    ├── statistiques-trim.ts
    ├── annees-boursieres.ts
    ├── avis.ts              (conservé)
    ├── donnees-eco.ts
        └── valeurs-liquidatives.ts
```

**Contrats** : chaque scraper exporte `scrapeX(opts?): Promise<ScrapeResult>`, idempotent via dédup checksum ou unique clé (emetteur+date+market), retries 2× backoff 2s/5s, logs structurés, mode `--dry-run` validable contre `hedjav-scrap/`.

**Code mort à supprimer** : `lib/brvm/scraper.ts` (sikafinance legacy), `app/api/brvm/summarize/`, `app/api/brvm/weekly-digest/`.

## 4. Routes API

| Route | Méthode | Auth | Rôle |
|---|---|---|---|
| `/api/brvm/scrape` | POST | Bearer | Orchestrateur full (conservé) |
| `/api/brvm/scrape/emetteurs` | POST | Bearer | Seed + sync référentiel |
| `/api/brvm/scrape/marche` | POST | Bearer | Résumé + cours + indices |
| `/api/brvm/scrape/rapports` | POST | Bearer | Rapports sociétés (étendu) |
| `/api/brvm/scrape/annonces` | POST | Bearer | Boucle 8 sous-types |
| `/api/brvm/scrape/publications` | POST | Bearer | Boucle 7 sous-types |
| `/api/brvm/emetteurs` | GET | Session admin | Liste + filtres secteur/indice |
| `/api/brvm/emetteurs/[slug]` | GET | Session admin | Détail + KPI + docs |
| `/api/brvm/emetteurs/[slug]/documents` | GET | Session admin | Docs d'une société filtres |
| `/api/brvm/documents` | GET | Session admin | (étendu family/subtype) |
| `/api/brvm/marche/snapshots` | GET | Session admin | Série temp résumé |
| `/api/brvm/marche/ticks` | GET | Session admin | Cours (filtres) |
| `/api/brvm/marche/indices` | GET | Session admin | Indices série temp |
| `/api/brvm/download` | POST / GET | Session admin / Bearer | (conservé) |
| `/api/brvm/maintenance` | GET | Session admin / Bearer | Diagnostic simple |
| `/api/brvm/alerts/digest` | POST | Session admin / Bearer | Étendu 4 familles |

Routes supprimées : `/api/brvm/summarize`, `/api/brvm/weekly-digest`.

## 5. UI Centre de Veille BRVM

### Navigation — sidebar à gauche (inspiration RichBourse)

```
┌────────────────────────┬───────────────────────────────────────┐
│ CENTRE BRVM            │ Breadcrumb                            │
│ ─────────────          │ ──────────────                        │
│ ▸ Vue d'ensemble       │ [Header contextuel]                   │
│                        │ [Filtres]                             │
│ ▾ Données de marché    │                                       │
│   • Résumé séance      │   Contenu principal (tableau,         │
│   • Actions            │    cartes KPI, graphique spark)       │
│   • Obligations        │                                       │
│   • Indices            │                                       │
│                        │                                       │
│ ▾ Rapports cotées      │                                       │
│   • Liste sociétés     │                                       │
│   • [Société active]   │                                       │
│                        │                                       │
│ ▾ Annonces émetteurs   │                                       │
│   • Toutes             │                                       │
│   • Convocations AG    │                                       │
│   • Projets résolution │                                       │
│   • Notations          │                                       │
│   • ESV                │                                       │
│   • Communiqués        │                                       │
│   • Chgt dirigeants    │                                       │
│   • Franchissements    │                                       │
│   • Info permanentes   │                                       │
│                        │                                       │
│ ▾ Publications         │                                       │
│   • BOC                │                                       │
│   • Bulletins mensuels │                                       │
│   • Stats trimestr.    │                                       │
│   • Années boursières  │                                       │
│   • Avis               │                                       │
│   • Données éco        │                                       │
│   • Valeurs liquid.    │                                       │
│                        │                                       │
│ ─────                  │                                       │
│ ⚙  Maintenance         │                                       │
│ ⏰ Alertes              │                                       │
└────────────────────────┴───────────────────────────────────────┘
```

### Rapports cotées — niveaux 1/2/3

- **Niveau 1** `/admin/brvm/rapports` — grille des sociétés : logo, nom, secteur, indices, dernier doc. Filtres secteur / indice / recherche.
- **Niveau 2** `/admin/brvm/rapports/[slug]` — page société : KPIs (nb docs par type, dernier rapport annuel, etc.) + tabs types (Tout | Rapports annuels | États financiers | Rapports semestriels | Rapports trimestriels | Commentaires activité).
- **Niveau 3** — filtre type actif → liste des docs de cette société × ce type, tri DESC.

### Design system appliqué

- Titres Cormorant Garamond 28-32px
- Corps DM Sans 14-15px
- Données DM Mono 13px (FCFA, dates, %)
- Couleurs CSS vars : `--n900`, `--n950`, `--cream`, `--g500`, rouge sobre `#B23A48` pour variations négatives
- Densité tableaux : `py-3`, bordure `--n900/5`, hover `--n900/2`, zébrage léger
- Badges : 2 formes stables — pill famille (sobre) + label subtype (gris)
- Filtres communs : période (preset + custom), société, secteur, indice, sous-type, recherche
- Pas de placeholder vide : si pas de données, empty state éditorial ("Aucune publication pour cette période — tirez le cordon pour scraper")

### Composants nouveaux

```
components/admin/brvm/
├── BrvmSidebar.tsx                 NEW
├── BrvmOverview.tsx                NEW — 4 cards univers
├── MarketSummaryPanel.tsx          NEW
├── MarketQuotesTable.tsx           NEW
├── MarketIndicesPanel.tsx          NEW
├── EmetteursGrid.tsx               NEW
├── EmetteurDetail.tsx              NEW
├── DocumentsTable.tsx              NEW — générique (réutilisé)
├── FiltersBar.tsx                  NEW
├── EmptyState.tsx                  NEW
└── (BrvmHubPanel.tsx supprimé ou renommé en BrvmOverview)
```

## 6. Maintenance BRVM

Réduction à **diagnostic admin simple** : la page `/admin/brvm/maintenance` devient une carte de 5-6 indicateurs (sources OK/KO, fraîcheur docs, backlog, dernière exécution scraper, stats rapides) + bouton « Rafraîchir ». Plus de rapport long. La supervision auto-notifiante (trigger → `admin_notifications`) reste active en arrière-plan.

## 7. Backfill depuis `hedjav-scrap/`

`scripts/import-brvm-history.ts` étendu :
1. Parser `/fr/emetteurs/societes-cotees` → seed `brvm_emetteurs`
2. Parser les pages société capturées → rattache docs existants
3. Parser les PDFs annuels/trim historiques → `brvm_documents` avec family/subtype remplis
4. Parser `/fr/cours-actions`, `/cours-obligations`, `/indices`, `/resume` HTML captures → `brvm_market_*`
5. Mode `--dry-run` + rapport

## 8. Plan d'exécution (phases)

| # | Phase | Livrable | Vérif |
|---|---|---|---|
| P0 | Fusion docs | `BRVM.md` fusionné, `DEPLOY.md` fusionné, suppressions | `ls docs/` |
| P1 | Migrations 027/028/029 | 3 SQL non-destructifs | Appliquer via Supabase SQL Editor |
| P2 | Seed `brvm_emetteurs` | Scraper + seed depuis `hedjav-scrap/` | Liste visible `/api/brvm/emetteurs` |
| P3 | Scrapers marché | 4 scrapers + route `/api/brvm/scrape/marche` | Insert OK dans `brvm_market_*` |
| P4 | Scrapers annonces 8 sous-types | 8 fichiers + extension route | Docs en base avec subtype |
| P5 | Scrapers publications 7 sous-types | 7 fichiers + route | Docs en base avec subtype |
| P6 | Extension rapports | États financiers, Commentaires activité | Docs subtype |
| P7 | UI refonte | Sidebar + Overview + 4 univers | `npm run build` OK |
| P8 | Suppression code mort | `scraper.ts` / `summarize` / `weekly-digest` supprimés | `tsc --noEmit` passe |
| P9 | Commits + PR | Branche `feature/brvm-refonte-4-univers` + PR | PR ouverte |

## 9. Garde-fous / non-négociables

- Migrations additives, pas de DROP
- `doc_type` legacy conservé pour compat descendante
- `brvm_data` conservé comme fallback (résumé séance legacy)
- Tri DESC verrouillé dans les helpers
- Liens prod = `https://egp.hedjav.com` (via `lib/url.ts` existant)
- Aucune clé en dur, `process.env` uniquement
- `tsc --noEmit` doit passer à chaque phase
- `/hedjav-scrap/` jamais commité

## 10. Critères de succès

1. Les 4 univers accessibles depuis la sidebar et peuplés de vrais données
2. Rapports sociétés navigables `société → type → docs`
3. 8 sous-catégories d'annonces présentes et scrapées
4. 7 catégories de publications présentes et scrapées
5. Données de marché historisées (ticks quotidiens)
6. Filtres utiles, tri DESC partout, pas d'artefacts visuels, pas d'onglets vides
7. `npm run build` OK, `tsc --noEmit` OK
8. Une PR ouverte sur `main`
