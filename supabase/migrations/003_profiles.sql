-- ============================================================
-- hedjav.com — Migration 003 : table profiles + auth (couche 5)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  email           text not null,
  full_name       text,
  country         text default 'BJ',          -- ISO-2 ; BJ, CI, SN, BF, ML, NE, TG, GW, OTHER
  phone           text,
  newsletter_opt  boolean not null default true,
  role            text not null default 'member' check (role in ('member','admin')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx  on public.profiles (role);

-- Trigger updated_at (réutilise la function créée pour ebooks)
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Trigger : créer automatiquement un profil à chaque nouveau auth.user
-- Lit full_name, country et newsletter_opt depuis raw_user_meta_data
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, country, newsletter_opt)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', 'BJ'),
    coalesce((new.raw_user_meta_data ->> 'newsletter_opt')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS : un utilisateur ne voit/édite que son propre profil
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_admin_read"  on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Les admins lisent tous les profils (utile couche 9)
create policy "profiles_admin_read"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
