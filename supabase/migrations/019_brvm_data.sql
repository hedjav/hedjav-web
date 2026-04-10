-- 019_brvm_data.sql — Table de stockage des donnees BRVM scrappees
-- Stocke : resume seance, cours actions, indices, BOC PDF, annonces

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
  article_id uuid REFERENCES articles(id),
  is_sent_to_members boolean DEFAULT false,
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brvm_data_date ON brvm_data(data_date DESC);
CREATE INDEX IF NOT EXISTS idx_brvm_data_type ON brvm_data(data_type);
CREATE INDEX IF NOT EXISTS idx_brvm_data_date_type ON brvm_data(data_date DESC, data_type);
ALTER TABLE brvm_data ENABLE ROW LEVEL SECURITY;

-- Bucket Storage pour les documents BRVM (BOC PDF, rapports)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brvm-documents', 'brvm-documents', false)
ON CONFLICT DO NOTHING;
