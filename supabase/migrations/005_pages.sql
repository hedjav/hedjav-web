-- ============================================================
-- hedjav.com — Migration 005 : table pages (pages institutionnelles)
-- ============================================================

create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text        not null unique,
  title           text        not null,
  body            text        not null,                          -- markdown
  cover_image_url text,
  meta_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pages_slug_idx on public.pages (slug);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- RLS : lecture publique
alter table public.pages enable row level security;
drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read"
  on public.pages for select
  using (true);
