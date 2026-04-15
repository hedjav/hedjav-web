-- 030_articles_workflow.sql
-- Refonte du module articles : passage d'un simple booléen is_published à un
-- vrai workflow éditorial (draft → review → published → archived).
--
-- Non-destructif :
--   - la colonne is_published est conservée pour compatibilité des lectures legacy
--   - un trigger garde les deux synchronisées (status est la source de vérité)
--   - backfill automatique : is_published=true → published, sinon draft
--
-- Traçabilité IA : on s'appuie sur articles.metadata jsonb qui existe déjà
-- (migration 006). Les champs attendus par la couche applicative :
--   metadata.source_type        : 'manual' | 'ai_subject' | 'ai_brvm'
--   metadata.source_documents[] : ids brvm_documents (si ai_brvm)
--   metadata.provider           : 'deepseek' | 'openai' | 'anthropic' | null
--   metadata.model              : id du modèle utilisé
--   metadata.prompt_version     : version du prompt (ex: 'articles/draft@v1')
--   metadata.generated_at       : ISO timestamp
--   metadata.quality_score      : snapshot au moment du scoring IA

-- 1) Status enum (draft / review / published / archived)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'article_status') then
    create type article_status as enum ('draft', 'review', 'published', 'archived');
  end if;
end$$;

-- 2) Ajout colonne status (non null, défaut draft)
alter table articles
  add column if not exists status article_status not null default 'draft';

-- 3) Backfill depuis is_published (uniquement si status est encore à la valeur par défaut)
update articles
   set status = case when is_published then 'published'::article_status else 'draft'::article_status end
 where status = 'draft'
   and is_published is not null;

-- 4) Trigger : garder is_published synchronisé avec status (status = source of truth)
create or replace function articles_sync_is_published() returns trigger
language plpgsql as $$
begin
  new.is_published := (new.status = 'published');
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end$$;

drop trigger if exists articles_sync_is_published_trg on articles;
create trigger articles_sync_is_published_trg
  before insert or update of status on articles
  for each row execute function articles_sync_is_published();

-- 5) Index pour les filtres fréquents (liste admin, blog public)
create index if not exists articles_status_created_at_idx
  on articles (status, created_at desc);

create index if not exists articles_status_category_idx
  on articles (status, category)
  where status = 'published';

comment on column articles.status is
  'Workflow éditorial. draft=en cours, review=à relire, published=visible public, archived=retiré. Source de vérité (is_published est dérivée).';
