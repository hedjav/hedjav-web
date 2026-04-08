-- ============================================================
-- hedjav.com — Migration 007 : last_visit_at sur profiles
-- Sert au système d'alertes du dashboard membre.
-- ============================================================

alter table public.profiles
  add column if not exists last_visit_at timestamptz;

create index if not exists profiles_last_visit_idx on public.profiles (last_visit_at desc);
