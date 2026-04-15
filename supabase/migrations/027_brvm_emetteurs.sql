-- ============================================================================
-- 027_brvm_emetteurs.sql
--
-- Référentiel des sociétés cotées BRVM — clé de voûte de la refonte 4 univers.
-- Permet la hiérarchie société → type → documents et les vues transversales
-- (par secteur, par indice).
--
-- Non destructif. Additif pur : CREATE ... IF NOT EXISTS.
-- ============================================================================

-- ── 1. Table brvm_emetteurs ────────────────────────────────────────────────
create table if not exists public.brvm_emetteurs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  ticker      text,
  name        text not null,
  full_name   text,
  isin        text,
  country     text,
  sector      text,
  market      text check (market in ('actions', 'obligations')),
  indices     text[] default '{}',
  aliases     text[] default '{}',
  is_active   boolean default true,
  logo_url    text,
  source_url  text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_brvm_emetteurs_sector   on public.brvm_emetteurs(sector);
create index if not exists idx_brvm_emetteurs_market   on public.brvm_emetteurs(market);
create index if not exists idx_brvm_emetteurs_active   on public.brvm_emetteurs(is_active) where is_active = true;
create index if not exists idx_brvm_emetteurs_country  on public.brvm_emetteurs(country);
create index if not exists idx_brvm_emetteurs_indices  on public.brvm_emetteurs using gin(indices);
create index if not exists idx_brvm_emetteurs_aliases  on public.brvm_emetteurs using gin(aliases);

-- ── 2. Trigger updated_at ──────────────────────────────────────────────────
create or replace function public.brvm_emetteurs_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_brvm_emetteurs_updated_at on public.brvm_emetteurs;
create trigger trg_brvm_emetteurs_updated_at
  before update on public.brvm_emetteurs
  for each row execute function public.brvm_emetteurs_touch_updated_at();

-- ── 3. RLS admin-only ──────────────────────────────────────────────────────
alter table public.brvm_emetteurs enable row level security;

drop policy if exists "brvm_emetteurs_admin_rw" on public.brvm_emetteurs;
create policy "brvm_emetteurs_admin_rw"
  on public.brvm_emetteurs
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

comment on table public.brvm_emetteurs is
  'Référentiel des sociétés cotées BRVM. Clé de voûte de la hiérarchie société → type → documents (refonte 2026-04-15).';
comment on column public.brvm_emetteurs.aliases is
  'Variations de nom pour rattachement automatique lors du scraping (ex: ["Sonatel SN", "SNTS", "Société Nationale des Télécoms"]).';
comment on column public.brvm_emetteurs.indices is
  'Indices BRVM auxquels la société appartient (ex: ["BRVM-C", "BRVM-30", "BRVM-PRES"]).';
