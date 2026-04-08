-- ============================================================
-- hedjav.com — Migration 006 : champs metadata jsonb extensibles
-- Règle transversale : rien n'est figé. Chaque table reçoit un champ
-- `metadata jsonb default '{}'` pour stocker des données arbitraires
-- (scoring IA, tags, A/B test, telemetry, future-proofing) sans migration.
-- ============================================================

alter table public.ebooks    add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.articles  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.profiles  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.purchases add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.pages     add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Index GIN sur metadata pour requêtes futures (ex: where metadata @> '{"ai_generated": true}')
create index if not exists ebooks_metadata_gin    on public.ebooks    using gin (metadata);
create index if not exists articles_metadata_gin  on public.articles  using gin (metadata);
create index if not exists profiles_metadata_gin  on public.profiles  using gin (metadata);
create index if not exists purchases_metadata_gin on public.purchases using gin (metadata);
create index if not exists pages_metadata_gin     on public.pages     using gin (metadata);
