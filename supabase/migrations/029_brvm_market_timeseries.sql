-- ============================================================================
-- 029_brvm_market_timeseries.sql
--
-- Séries temporelles pour l'univers "Données de marché" (refonte 4 univers).
-- 3 nouvelles tables : snapshots de séance + cours quotidiens par société +
-- indices BRVM quotidiens.
--
-- Ces tables remplacent progressivement brvm_data (legacy JSON quotidien
-- écrasé). brvm_data reste en place comme fallback.
--
-- Non destructif. Additif pur.
-- ============================================================================

-- ── 1. Résumé de séance quotidien ──────────────────────────────────────────
create table if not exists public.brvm_market_snapshots (
  id                        uuid primary key default gen_random_uuid(),
  snapshot_date             date not null,
  source_id                 uuid references public.brvm_sources(id) on delete set null,
  valeur_transactions_fcfa  numeric,
  capi_actions_fcfa         numeric,
  capi_obligations_fcfa     numeric,
  nb_titres_echanges        integer,
  nb_transactions           integer,
  raw                       jsonb default '{}',
  created_at                timestamptz default now(),
  unique(snapshot_date, source_id)
);

create index if not exists idx_brvm_market_snapshots_date
  on public.brvm_market_snapshots(snapshot_date desc);

-- ── 2. Cours quotidiens actions/obligations ────────────────────────────────
create table if not exists public.brvm_market_ticks (
  id             uuid primary key default gen_random_uuid(),
  emetteur_id    uuid references public.brvm_emetteurs(id) on delete cascade,
  tick_date      date not null,
  market         text not null check (market in ('actions', 'obligations')),
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

create index if not exists idx_brvm_market_ticks_date
  on public.brvm_market_ticks(tick_date desc);

create index if not exists idx_brvm_market_ticks_emetteur_date
  on public.brvm_market_ticks(emetteur_id, tick_date desc);

create index if not exists idx_brvm_market_ticks_market_date
  on public.brvm_market_ticks(market, tick_date desc);

-- ── 3. Indices BRVM (BRVM-C, BRVM-30, BRVM-PRES, etc.) ─────────────────────
create table if not exists public.brvm_indices_ticks (
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

create index if not exists idx_brvm_indices_ticks_date
  on public.brvm_indices_ticks(tick_date desc);

create index if not exists idx_brvm_indices_ticks_code_date
  on public.brvm_indices_ticks(index_code, tick_date desc);

-- ── 4. RLS admin-only sur les 3 tables ────────────────────────────────────
alter table public.brvm_market_snapshots enable row level security;
alter table public.brvm_market_ticks     enable row level security;
alter table public.brvm_indices_ticks    enable row level security;

drop policy if exists "brvm_market_snapshots_admin_rw" on public.brvm_market_snapshots;
create policy "brvm_market_snapshots_admin_rw" on public.brvm_market_snapshots
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "brvm_market_ticks_admin_rw" on public.brvm_market_ticks;
create policy "brvm_market_ticks_admin_rw" on public.brvm_market_ticks
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "brvm_indices_ticks_admin_rw" on public.brvm_indices_ticks;
create policy "brvm_indices_ticks_admin_rw" on public.brvm_indices_ticks
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

comment on table public.brvm_market_snapshots is
  'Résumé quotidien de séance (valeur transactions, capi actions/obligations). Une ligne par jour et par source.';
comment on table public.brvm_market_ticks is
  'Cours quotidiens par émetteur (actions + obligations). Série temporelle propre remplace le JSON legacy de brvm_data.';
comment on table public.brvm_indices_ticks is
  'Indices BRVM quotidiens (BRVM-C, BRVM-30, BRVM-PRES, etc.). Série temporelle.';
