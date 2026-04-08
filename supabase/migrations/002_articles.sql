-- ============================================================
-- hedjav.com — Migration 002 : table articles (couche 4)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  title           text        not null,
  slug            text        not null unique,
  excerpt         text        not null,
  body            text        not null,                          -- markdown
  category        text        not null,
  cover_image_url text,
  author          text        not null default 'Hermann D. AVAHOUIN',
  published_at    timestamptz,                                    -- null = brouillon
  featured        boolean     not null default false,
  is_published    boolean     not null default false,
  created_by      text,                                           -- 'hermann', 'claude-sonnet-4-6'…
  source          text        not null default 'manual'
                  check (source in ('manual','ai')),
  quality_score   integer     check (quality_score is null or quality_score between 0 and 100),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists articles_slug_idx          on public.articles (slug);
create index if not exists articles_published_idx     on public.articles (is_published, published_at desc) where is_published = true;
create index if not exists articles_featured_idx      on public.articles (featured) where featured = true;
create index if not exists articles_category_idx      on public.articles (category);

-- Trigger updated_at (réutilise la function créée pour ebooks)
drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- RLS : lecture publique des articles publiés ET dont la date est passée
alter table public.articles enable row level security;

drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read"
  on public.articles for select
  using (
    is_published = true
    and published_at is not null
    and published_at <= now()
  );
