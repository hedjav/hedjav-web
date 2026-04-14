-- ============================================================================
-- 025_brvm_alerts.sql
--
-- Extension Centre de Veille BRVM : journal des alertes email + catégorisation
-- optionnelle des documents (secteur, indice boursier).
--
-- Non destructif. Additif pur : ALTER ... IF NOT EXISTS + CREATE ... IF NOT EXISTS.
-- Compatible avec les bases où la migration 023 (brvm_documents recréée) a déjà
-- été appliquée.
-- ============================================================================

-- ── 1. Colonnes optionnelles de catégorisation ─────────────────────────────
-- Si elles n'existent pas encore, on les ajoute. Nullable par défaut : pas de
-- migration de données nécessaire.

alter table public.brvm_documents
  add column if not exists sector text,
  add column if not exists market_index text;

create index if not exists idx_brvm_documents_sector
  on public.brvm_documents (sector)
  where sector is not null;

create index if not exists idx_brvm_documents_market_index
  on public.brvm_documents (market_index)
  where market_index is not null;

-- ── 2. Journal des alertes email admin ────────────────────────────────────
-- Trace chaque digest (daily / weekly / monthly) envoyé aux admins, pour :
--   - éviter les doublons si un cron tombe deux fois
--   - suivre le taux d'erreur d'envoi
--   - afficher un historique dans /admin/brvm/alertes

create table if not exists public.brvm_alert_log (
  id uuid primary key default gen_random_uuid(),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'manual')),
  period_from date,
  period_to date,
  document_count int not null default 0,
  recipients_count int not null default 0,
  status text not null check (status in ('success', 'partial', 'error', 'empty')),
  error_message text,
  ai_provider text,         -- deepseek | openai | anthropic | null si IA skippée
  ai_model text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists idx_brvm_alert_log_created_at
  on public.brvm_alert_log (created_at desc);

create index if not exists idx_brvm_alert_log_frequency_date
  on public.brvm_alert_log (frequency, created_at desc);

-- ── 3. RLS admin-only ──────────────────────────────────────────────────────
alter table public.brvm_alert_log enable row level security;

drop policy if exists "brvm_alert_log_admin_rw" on public.brvm_alert_log;
create policy "brvm_alert_log_admin_rw"
  on public.brvm_alert_log
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

comment on table public.brvm_alert_log is
  'Historique des digests email admin envoyés depuis /api/brvm/alerts/digest. Sert d''anti-doublon et d''audit.';
