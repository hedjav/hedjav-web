-- ============================================================================
-- 028_brvm_doc_taxonomy.sql
--
-- Refonte 4 univers : ajoute doc_family (4 valeurs) + doc_subtype (25+ valeurs
-- libres) + emetteur_id FK → brvm_emetteurs. Conserve doc_type legacy pour
-- compatibilité descendante.
--
-- Non destructif. Additif + backfill.
-- ============================================================================

-- ── 1. Colonnes doc_family + doc_subtype + emetteur_id ─────────────────────
alter table public.brvm_documents
  add column if not exists doc_family text
    check (doc_family in ('market', 'report', 'announcement', 'publication')),
  add column if not exists doc_subtype text,
  add column if not exists emetteur_id uuid
    references public.brvm_emetteurs(id) on delete set null;

-- ── 2. Backfill doc_family + doc_subtype depuis doc_type existant ──────────
update public.brvm_documents
set
  doc_family = case doc_type
    when 'boc'                  then 'publication'
    when 'avis'                 then 'publication'
    when 'rapport_annuel'       then 'report'
    when 'rapport_trimestriel'  then 'report'
    when 'rapport_semestriel'   then 'report'
    when 'communique'           then 'announcement'
    when 'annonce'              then 'announcement'
    when 'note_information'     then 'announcement'
    else 'publication'
  end,
  doc_subtype = doc_type
where doc_family is null;

-- ── 3. Indexes pour les requêtes 4 univers ─────────────────────────────────
create index if not exists idx_brvm_documents_family_date
  on public.brvm_documents (doc_family, doc_date desc nulls last);

create index if not exists idx_brvm_documents_subtype_date
  on public.brvm_documents (doc_subtype, doc_date desc nulls last);

create index if not exists idx_brvm_documents_emetteur_date
  on public.brvm_documents (emetteur_id, doc_date desc nulls last)
  where emetteur_id is not null;

create index if not exists idx_brvm_documents_family_discovered
  on public.brvm_documents (doc_family, discovered_at desc);

-- ── 4. Rattachement auto depuis issuer_slug quand possible ─────────────────
-- Quand un emetteur existe avec le même slug, on rattache automatiquement.
-- Se relance à chaque nouveau seed d'émetteurs.
update public.brvm_documents d
set emetteur_id = e.id
from public.brvm_emetteurs e
where d.emetteur_id is null
  and d.issuer_slug is not null
  and lower(d.issuer_slug) = lower(e.slug);

comment on column public.brvm_documents.doc_family is
  '4 univers BRVM : market | report | announcement | publication. Détermine l''onglet UI principal.';
comment on column public.brvm_documents.doc_subtype is
  'Sous-type métier fin (ex: convocation_ag, bulletin_mensuel, rapport_annuel). Remplace doc_type pour la logique produit mais ne le remplace pas en DB.';
comment on column public.brvm_documents.emetteur_id is
  'FK vers brvm_emetteurs. Nullable : certains docs (BOC, publications marché) ne concernent pas une société spécifique.';
