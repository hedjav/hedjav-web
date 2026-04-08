-- ============================================================
-- hedjav.com — Migration 009 : table newsletter_subscribers
-- Remplace l'intégration Brevo. Les emails sont stockés en base
-- et envoyés via lib/email/sender.ts (Resend ou stub console).
-- ============================================================

create table if not exists public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text        not null unique,
  source          text,                                            -- 'home', 'article', 'register', 'footer'…
  is_active       boolean     not null default true,
  unsubscribed_at timestamptz,
  metadata        jsonb       not null default '{}'::jsonb,
  subscribed_at   timestamptz not null default now()
);

create index if not exists newsletter_subscribers_email_idx  on public.newsletter_subscribers (email);
create index if not exists newsletter_subscribers_active_idx on public.newsletter_subscribers (is_active) where is_active = true;

-- RLS : insertion publique (formulaire de la home), lecture/update admin only via service_role
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert"
  on public.newsletter_subscribers for insert
  with check (true);
