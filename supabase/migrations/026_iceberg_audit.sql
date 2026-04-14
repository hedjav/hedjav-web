-- ============================================================================
-- 026_iceberg_audit.sql
--
-- Correctifs structurels post-PR #69 :
--   1. admin_notifications : target_url + entity_type/entity_id → clic utile.
--  2. Triggers réécrits pour remplir les nouveaux champs.
--   3. admin_settings : store clé/valeur pour config persistante (fréquences
--      d'alertes BRVM multi-select, flags supervision).
--   4. ai_logs : CHECK étendu (success/error/skipped/warning).
--   5. Index supplémentaires pour les filtres Centre BRVM (issuer_slug,
--      sector, market_index combinés à doc_date).
--
-- Additif / non destructif. À appliquer après 025.
-- ============================================================================

-- ── 1. admin_notifications : colonnes cibles de clic ──────────────────────

alter table public.admin_notifications
  add column if not exists target_url text,
  add column if not exists entity_type text,
  add column if not exists entity_id text;

create index if not exists idx_admin_notifications_unread_created
  on public.admin_notifications (is_read, created_at desc);

create index if not exists idx_admin_notifications_entity
  on public.admin_notifications (entity_type, entity_id)
  where entity_type is not null;

-- Backfill best-effort : construire target_url depuis metadata pour les
-- anciennes notifications qui ont un document_id / purchase_id / profile_id.
update public.admin_notifications
set target_url = case
    when target_url is not null then target_url
    when type = 'brvm_document' and (metadata->>'document_id') is not null
         then '/admin/brvm?doc=' || (metadata->>'document_id')
    when type = 'purchase' and (metadata->>'purchase_id') is not null
         then '/admin/ventes?id=' || (metadata->>'purchase_id')
    when type = 'registration' and (metadata->>'profile_id') is not null
         then '/admin/membres/' || (metadata->>'profile_id')
    when type = 'newsletter' and (metadata->>'subscriber_email') is not null
         then '/admin/newsletter?email=' || (metadata->>'subscriber_email')
    when type = 'unsubscribe' and (metadata->>'subscriber_email') is not null
         then '/admin/newsletter?email=' || (metadata->>'subscriber_email')
    when type = 'subscriber' and (metadata->>'subscriber_email') is not null
         then '/admin/newsletter?email=' || (metadata->>'subscriber_email')
    when type = 'member' then '/admin/membres'
    when type = 'report'  then '/admin/brvm'
    when type = 'error' or type = 'ai_error' then '/admin/ia'
    else '/admin'
  end,
  entity_type = case
    when type in ('brvm_document')
         and (metadata->>'document_id') is not null then 'brvm_document'
    when type = 'purchase' and (metadata->>'purchase_id') is not null then 'purchase'
    when type = 'registration' and (metadata->>'profile_id') is not null then 'profile'
    when type in ('newsletter','subscriber','unsubscribe')
         and (metadata->>'subscriber_email') is not null then 'subscriber'
    else entity_type
  end,
  entity_id = coalesce(
    metadata->>'document_id',
    metadata->>'purchase_id',
    metadata->>'profile_id',
    metadata->>'subscriber_email',
    entity_id
  )
where target_url is null;

comment on column public.admin_notifications.target_url is
  'URL admin vers laquelle pointe la notification (ex: /admin/brvm?doc=UUID). Évite le fallback /admin sans sens métier.';
comment on column public.admin_notifications.entity_type is
  'Type d''entité liée (brvm_document, purchase, profile, subscriber, campaign_send…).';
comment on column public.admin_notifications.entity_id is
  'Identifiant brut de l''entité (peut être UUID, email, slug).';

-- ── 2. Trigger brvm_documents : étoffer la notification ───────────────────
-- Remplace la version de 023_brvm_clean_reset.sql pour inclure target_url.

create or replace function public.notify_new_brvm_document()
returns trigger
language plpgsql
as $$
declare
  v_priority text;
  v_title text;
  v_target text;
begin
  -- Priorité métier : BOC = high, reste = normal
  v_priority := case when new.doc_type = 'boc' then 'high' else 'normal' end;

  v_title := case
    when new.doc_type = 'boc' then 'Nouveau BOC BRVM : ' || coalesce(to_char(new.doc_date, 'DD/MM/YYYY'), to_char(new.discovered_at, 'DD/MM/YYYY'))
    else 'Nouveau document BRVM (' || new.doc_type || ') : ' || coalesce(new.title, '—')
  end;

  v_target := '/admin/brvm?doc=' || new.id::text;

  insert into public.admin_notifications (
    type, title, message, priority, metadata, target_url, entity_type, entity_id
  ) values (
    'brvm_document',
    v_title,
    coalesce(new.description, new.title),
    v_priority,
    jsonb_build_object(
      'document_id', new.id,
      'doc_type', new.doc_type,
      'source_id', new.source_id,
      'pdf_url', new.pdf_url,
      'issuer_slug', new.issuer_slug,
      'doc_date', new.doc_date
    ),
    v_target,
    'brvm_document',
    new.id::text
  );

  return new;
end;
$$;

-- ── 3. admin_settings : config clé/valeur pour les alertes + flags ────────

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.admin_settings enable row level security;

drop policy if exists "admin_settings_admin_rw" on public.admin_settings;
create policy "admin_settings_admin_rw"
  on public.admin_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Seed par défaut : les 3 fréquences d'alerte BRVM sont actives.
insert into public.admin_settings (key, value)
values (
  'brvm_alert_frequencies',
  jsonb_build_object(
    'daily', true,
    'weekly', true,
    'monthly', true
  )
)
on conflict (key) do nothing;

-- Seed : seuils de maintenance auto (alerting supervision réelle)
insert into public.admin_settings (key, value)
values (
  'brvm_maintenance_thresholds',
  jsonb_build_object(
    'source_stale_hours', 48,
    'source_critical_hours', 168,
    'backlog_warning', 50,
    'freshness_warning_days', 7,
    'notify_on_degraded', true
  )
)
on conflict (key) do nothing;

-- ── 4. ai_logs : étendre le CHECK status ──────────────────────────────────
-- success | error | skipped | warning (pour les runs qui marchent mais dégradés)

do $$
begin
  alter table public.ai_logs drop constraint if exists ai_logs_status_check;
  alter table public.ai_logs
    add constraint ai_logs_status_check
    check (status in ('success', 'error', 'skipped', 'warning'));
exception when others then
  -- tolérant : si la contrainte n'existait pas avec ce nom ou la table
  -- n'existe pas encore (env dev) → on continue.
  null;
end$$;

create index if not exists idx_ai_logs_action_created
  on public.ai_logs (action, created_at desc);
create index if not exists idx_ai_logs_status_created
  on public.ai_logs (status, created_at desc);

-- ── 5. Index Centre BRVM : filtres société / secteur / indice + date ──────

create index if not exists idx_brvm_documents_sector_date
  on public.brvm_documents (sector, discovered_at desc)
  where sector is not null;

create index if not exists idx_brvm_documents_market_index_date
  on public.brvm_documents (market_index, discovered_at desc)
  where market_index is not null;

create index if not exists idx_brvm_documents_issuer_date
  on public.brvm_documents (issuer_slug, discovered_at desc)
  where issuer_slug is not null;

-- ── 6. Site config : alignement textes publics (13 ans d'expérience) ──────
-- L'ancienne biographie mentionnait 17 ans (valeur historique qui a évolué
-- avec la trajectoire pro). Les textes publics sont désormais uniformément
-- calés sur 13 ans dans tout le site.

update public.site_config
set value = replace(value, '17 ans', '13 ans')
where key in (
  'fondateur_bio',
  'fondateur_bullet_1',
  'founder_title',
  'founder_subtitle',
  'founder_bio_short'
)
  and value like '%17 ans%';

-- ── 7. Commentaires pour la doc DB ────────────────────────────────────────

comment on table public.admin_settings is
  'Configuration clé/valeur admin (fréquences alertes BRVM, seuils supervision, flags produit).';
