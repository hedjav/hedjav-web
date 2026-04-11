-- 023_brvm_clean_reset.sql
-- RESET COMPLET des tables BRVM veille documentaire.
--
-- À exécuter si tu vois l'une de ces erreurs :
--   - "column source_id does not exist"
--   - "Source brvm-org introuvable" en cliquant Lancer la veille
--   - tables brvm_sources / brvm_documents partiellement créées
--
-- DESTRUCTIF pour brvm_documents et brvm_sources : tout est supprimé puis recréé.
-- N'affecte PAS brvm_data (données marché legacy).
--
-- À copier-coller IN EXTENSO dans Supabase Dashboard → SQL Editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : DROP des tables BRVM veille (CASCADE pour les triggers/policies)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS brvm_documents CASCADE;
DROP TABLE IF EXISTS brvm_sources CASCADE;

-- Aussi nettoyer la fonction trigger si elle existe d'une exécution antérieure
DROP FUNCTION IF EXISTS notify_new_brvm_document() CASCADE;
DROP FUNCTION IF EXISTS brvm_set_updated_at() CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : table brvm_sources
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE brvm_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  base_url text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brvm_sources_priority ON brvm_sources(priority);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : SEED des sources (avant toute autre chose)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO brvm_sources (slug, name, base_url, priority, metadata) VALUES
  ('brvm-org', 'BRVM (officiel)', 'https://www.brvm.org/fr', 10,
   '{"description": "Source officielle BRVM — prioritaire pour BOC, rapports sociétés cotées, annonces"}'::jsonb),
  ('bfin', 'BRVM BFIN', 'https://bfin.brvm.org', 20,
   '{"description": "Back-office financier BRVM — source BOC directe"}'::jsonb),
  ('sikafinance', 'Sikafinance', 'https://www.sikafinance.com', 30,
   '{"description": "Agrégateur — fallback données marché"}'::jsonb);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : table brvm_documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE brvm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES brvm_sources(id) ON DELETE RESTRICT,
  doc_type text NOT NULL CHECK (doc_type IN (
    'boc',
    'rapport_annuel',
    'rapport_trimestriel',
    'rapport_semestriel',
    'communique',
    'annonce',
    'note_information',
    'avis',
    'autre'
  )),
  doc_date date,
  title text NOT NULL,
  description text,
  source_url text NOT NULL,
  pdf_url text,
  issuer_slug text,
  issuer_name text,
  checksum text NOT NULL UNIQUE,
  is_new boolean DEFAULT true,
  is_processed boolean DEFAULT false,
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id),
  discovered_at timestamptz DEFAULT now(),
  published_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brvm_documents_source ON brvm_documents(source_id);
CREATE INDEX idx_brvm_documents_type ON brvm_documents(doc_type);
CREATE INDEX idx_brvm_documents_date ON brvm_documents(doc_date DESC NULLS LAST);
CREATE INDEX idx_brvm_documents_discovered ON brvm_documents(discovered_at DESC);
CREATE INDEX idx_brvm_documents_is_new ON brvm_documents(is_new) WHERE is_new = true;
CREATE INDEX idx_brvm_documents_issuer ON brvm_documents(issuer_slug) WHERE issuer_slug IS NOT NULL;
CREATE INDEX idx_brvm_documents_type_date ON brvm_documents(doc_type, doc_date DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : RLS (admin only — service-role bypass automatiquement)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE brvm_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE brvm_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brvm_sources_admin_all" ON brvm_sources
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "brvm_documents_admin_all" ON brvm_documents
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 6 : trigger updated_at + notification BOC priority high
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION brvm_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brvm_sources_updated_at
  BEFORE UPDATE ON brvm_sources
  FOR EACH ROW EXECUTE FUNCTION brvm_set_updated_at();

CREATE TRIGGER trg_brvm_documents_updated_at
  BEFORE UPDATE ON brvm_documents
  FOR EACH ROW EXECUTE FUNCTION brvm_set_updated_at();

CREATE FUNCTION notify_new_brvm_document()
RETURNS trigger AS $$
DECLARE
  v_priority text;
  v_title text;
BEGIN
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

CREATE TRIGGER trg_notify_new_brvm_document
  AFTER INSERT ON brvm_documents
  FOR EACH ROW EXECUTE FUNCTION notify_new_brvm_document();

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 7 : recharge le cache PostgREST (sinon supabase-js ne voit pas les
-- nouvelles tables avant un redémarrage de l'API)
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION : exécute manuellement à la fin et tu DOIS voir 3 lignes
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id, slug, name, priority FROM brvm_sources ORDER BY priority;
