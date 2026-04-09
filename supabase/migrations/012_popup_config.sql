-- 012_popup_config.sql — Configuration pop-up lead magnet

CREATE TABLE IF NOT EXISTS popup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id uuid REFERENCES ebooks(id),
  is_active boolean DEFAULT false,
  display_delay_seconds integer DEFAULT 30,
  scroll_threshold_percent integer DEFAULT 60,
  headline text DEFAULT 'Recevez votre guide gratuit',
  subheadline text,
  cta_text text DEFAULT 'Recevoir mon guide gratuit',
  disclaimer text DEFAULT 'Gratuit, sans spam. Désinscription en 1 clic.',
  stats_shown integer DEFAULT 0,
  stats_submitted integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE popup_config ENABLE ROW LEVEL SECURITY;
