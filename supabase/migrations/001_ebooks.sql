-- ============================================================
-- hedjav.com — Migration 001 : table ebooks (couche 3)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.ebooks (
  id                uuid primary key default gen_random_uuid(),
  title             text        not null,
  slug              text        not null unique,
  short_description text        not null,
  description       text        not null,
  price             integer     not null check (price >= 0),
  original_price    integer     not null check (original_price >= 0),
  cover_image_url   text,
  fedapay_link      text        not null,
  features          jsonb       not null default '[]'::jsonb,
  target_audience   jsonb       not null default '[]'::jsonb,
  is_published      boolean     not null default true,
  is_featured       boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists ebooks_slug_idx        on public.ebooks (slug);
create index if not exists ebooks_published_idx   on public.ebooks (is_published) where is_published = true;
create index if not exists ebooks_featured_idx    on public.ebooks (is_featured)  where is_featured  = true;

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ebooks_set_updated_at on public.ebooks;
create trigger ebooks_set_updated_at
  before update on public.ebooks
  for each row execute function public.set_updated_at();

-- RLS : lecture publique des ebooks publiés uniquement
alter table public.ebooks enable row level security;

drop policy if exists "ebooks_public_read" on public.ebooks;
create policy "ebooks_public_read"
  on public.ebooks for select
  using (is_published = true);
