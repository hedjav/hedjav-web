-- 020_brvm_refactor.sql
-- Veille documentaire BRVM : sources hiérarchisées + documents dédupliqués par checksum.
--
-- Design :
-- - brvm_data (migration 019) reste la table des données marché (cours, indices, séance).
-- - brvm_sources liste les sources de veille avec leur priorité (brvm.org > bfin > sikafinance).
-- - brvm_documents est une table documentaire distincte avec dédup par checksum SHA256.
-- - Pas de stockage des PDFs en base : on stocke les métadonnées + URL + checksum.
-- - metadata jsonb partout pour extensibilité future sans migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Filet de sécurité : si la migration 019 n'a jamais été appliquée,
-- on crée la table brvm_data + le bucket brvm-documents ici (IF NOT EXISTS →
-- idempotent, ne casse rien si 019 est déjà appliquée).
-- Sans ça, /api/brvm/scrape échoue sur les cours/indices.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brvm_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_date date NOT NULL,
  data_type text NOT NULL,
  title text,
  content text,
  file_url text,
  source_url text,
  raw_data jsonb DEFAULT '{}',
  ai_summary text,
  article_id uuid,
  is_sent_to_members boolean DEFAULT false,
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brvm_data_date ON brvm_data(data_date DESC);
CREATE INDEX IF NOT EXISTS idx_brvm_data_type ON brvm_data(data_type);
CREATE INDEX IF NOT EXISTS idx_brvm_data_date_type ON brvm_data(data_date DESC, data_type);
ALTER TABLE brvm_data ENABLE ROW LEVEL SECURITY;

-- Contrainte unique (data_date, data_type) nécessaire pour ON CONFLICT du scraper
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brvm_data_date_type_unique'
  ) THEN
    ALTER TABLE brvm_data ADD CONSTRAINT brvm_data_date_type_unique UNIQUE (data_date, data_type);
  END IF;
END $$;

-- Bucket storage pour les PDFs BRVM legacy
INSERT INTO storage.buckets (id, name, public)
VALUES ('brvm-documents', 'brvm-documents', false)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sources BRVM
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brvm_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,           -- 'brvm-org' | 'bfin' | 'sikafinance'
  name text NOT NULL,                  -- 'BRVM (officiel)'
  base_url text NOT NULL,              -- 'https://www.brvm.org/fr'
  priority integer NOT NULL DEFAULT 100, -- plus bas = plus prioritaire
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brvm_sources_priority ON brvm_sources(priority);

-- Seed : ordre de priorité métier défini dans le CDC
INSERT INTO brvm_sources (slug, name, base_url, priority, metadata) VALUES
  ('brvm-org', 'BRVM (officiel)', 'https://www.brvm.org/fr', 10,
   '{"description": "Source officielle BRVM — prioritaire pour BOC, rapports sociétés cotées, annonces"}'::jsonb),
  ('bfin', 'BRVM BFIN', 'https://bfin.brvm.org', 20,
   '{"description": "Back-office financier BRVM — source BOC directe"}'::jsonb),
  ('sikafinance', 'Sikafinance', 'https://www.sikafinance.com', 30,
   '{"description": "Agrégateur — fallback données marché"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Documents BRVM (veille documentaire)
-- ─────────────────────────────────────────────────────────────────────────────
-- doc_type contraint : évite les valeurs fourre-tout.
-- checksum UNIQUE : garantit l'idempotence du scraping (même URL scrapée 2 fois = 1 ligne).
-- is_new : drapeau pour l'onglet "Nouveautés" admin, reset manuellement après traitement.
CREATE TABLE IF NOT EXISTS brvm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source_id uuid NOT NULL REFERENCES brvm_sources(id) ON DELETE RESTRICT,
  doc_type text NOT NULL CHECK (doc_type IN (
    'boc',                  -- Bulletin Officiel de la Cote (PRIORITÉ MÉTIER)
    'rapport_annuel',       -- Rapport annuel société cotée
    'rapport_trimestriel',  -- États financiers trimestriels
    'rapport_semestriel',   -- États financiers semestriels
    'communique',           -- Communiqué émetteur
    'annonce',              -- Annonces diverses
    'note_information',     -- Note d'information AMF-UMOA
    'avis',                 -- Avis BRVM
    'autre'                 -- Fallback
  )),

  doc_date date,              -- Date figurant sur le document (ex: date du BOC)
  title text NOT NULL,
  description text,

  -- URLs
  source_url text NOT NULL,   -- Page HTML où le document a été découvert
  pdf_url text,               -- Lien direct vers le PDF (peut être null)

  -- Émetteur (pour rapports/communiqués société cotée)
  issuer_slug text,           -- ex: 'air-liquide-ci', 'boa-ci', 'sonatel'
  issuer_name text,

  -- Déduplication
  checksum text NOT NULL UNIQUE, -- SHA256 composite : hash(source_slug|pdf_url||source_url|title)

  -- Workflow veille
  is_new boolean DEFAULT true,   -- Badge "nouveauté" en admin
  is_processed boolean DEFAULT false, -- Admin a traité (lu, classé, publié)
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id),

  -- Provenance & audit
  discovered_at timestamptz DEFAULT now(), -- Quand le scraper l'a vu la 1ère fois
  published_at timestamptz,               -- Date de publication officielle si connue

  -- Extensibilité
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes critiques pour les requêtes admin
CREATE INDEX IF NOT EXISTS idx_brvm_documents_source ON brvm_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_brvm_documents_type ON brvm_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_brvm_documents_date ON brvm_documents(doc_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_brvm_documents_discovered ON brvm_documents(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_brvm_documents_is_new ON brvm_documents(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_brvm_documents_issuer ON brvm_documents(issuer_slug) WHERE issuer_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brvm_documents_type_date ON brvm_documents(doc_type, doc_date DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — admin only (service-role bypass RLS automatiquement)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE brvm_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE brvm_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brvm_sources_admin_all" ON brvm_sources;
CREATE POLICY "brvm_sources_admin_all" ON brvm_sources
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "brvm_documents_admin_all" ON brvm_documents;
CREATE POLICY "brvm_documents_admin_all" ON brvm_documents
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fonction updated_at trigger (réutilisable)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION brvm_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brvm_sources_updated_at ON brvm_sources;
CREATE TRIGGER trg_brvm_sources_updated_at
  BEFORE UPDATE ON brvm_sources
  FOR EACH ROW EXECUTE FUNCTION brvm_set_updated_at();

DROP TRIGGER IF EXISTS trg_brvm_documents_updated_at ON brvm_documents;
CREATE TRIGGER trg_brvm_documents_updated_at
  BEFORE UPDATE ON brvm_documents
  FOR EACH ROW EXECUTE FUNCTION brvm_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Notification admin sur nouveau document BRVM (BOC = priorité haute)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_brvm_document()
RETURNS trigger AS $$
DECLARE
  v_priority text;
  v_title text;
BEGIN
  -- BOC = priorité haute car c'est le cœur métier
  IF NEW.doc_type = 'boc' THEN
    v_priority := 'high';
    v_title := 'Nouveau BOC BRVM : ' || COALESCE(NEW.doc_date::text, 'sans date');
  ELSE
    v_priority := 'normal';
    v_title := 'Nouveau document BRVM (' || NEW.doc_type || ') : ' || NEW.title;
  END IF;

  INSERT INTO admin_notifications (type, title, message, priority, metadata)
  VALUES (
    'brvm_document',
    v_title,
    COALESCE(NEW.description, NEW.title),
    v_priority,
    jsonb_build_object(
      'document_id', NEW.id,
      'doc_type', NEW.doc_type,
      'source_id', NEW.source_id,
      'pdf_url', NEW.pdf_url
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_brvm_document ON brvm_documents;
CREATE TRIGGER trg_notify_new_brvm_document
  AFTER INSERT ON brvm_documents
  FOR EACH ROW EXECUTE FUNCTION notify_new_brvm_document();

COMMENT ON TABLE brvm_sources IS 'Sources BRVM avec hiérarchie de priorité (brvm.org > bfin > sikafinance)';
COMMENT ON TABLE brvm_documents IS 'Veille documentaire BRVM — dédup par checksum, pas de stockage PDF';
COMMENT ON COLUMN brvm_documents.checksum IS 'SHA256 de source_slug|pdf_url||source_url|title — garantit idempotence scraping';
COMMENT ON COLUMN brvm_documents.is_new IS 'Drapeau pour onglet Nouveautés admin, reset via is_processed';
