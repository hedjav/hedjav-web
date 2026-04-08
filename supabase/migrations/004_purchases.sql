-- ============================================================
-- hedjav.com — Migration 004 : table purchases (couche 7)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete set null,  -- nullable : achat anonyme
  email           text        not null,
  ebook_id        uuid        not null references public.ebooks(id) on delete restrict,
  amount          integer     not null check (amount >= 0),
  currency        text        not null default 'XOF',
  payment_ref     text        unique not null,                    -- transaction id FedaPay
  status          text        not null default 'pending'
                  check (status in ('pending','paid','failed','refunded')),
  payment_method  text,                                            -- 'wave', 'orange_money', 'mtn_momo', 'card'…
  raw_payload     jsonb,                                           -- payload brut webhook (audit)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists purchases_user_id_idx     on public.purchases (user_id);
create index if not exists purchases_email_idx       on public.purchases (email);
create index if not exists purchases_status_idx      on public.purchases (status);
create index if not exists purchases_payment_ref_idx on public.purchases (payment_ref);

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS : un user voit ses propres achats (par user_id OU email)
-- ============================================================
alter table public.purchases enable row level security;

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own"
  on public.purchases for select
  using (
    user_id = auth.uid()
    or email = (select email from auth.users where id = auth.uid())
  );
