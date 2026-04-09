-- 010_campaigns.sql — Campagnes email, tunnel de vente, tracking

-- ── Campagnes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('welcome_sequence','promo','weekly','custom')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  target_tags jsonb DEFAULT '[]',
  created_by text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Emails de campagne (séquence) ──────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  position integer NOT NULL,
  subject text NOT NULL,
  body_prompt text,
  body_html text,
  delay_days integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── Envois individuels + tracking ──────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_email_id uuid NOT NULL REFERENCES campaign_emails(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','opened','clicked','failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── Index ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign ON campaign_emails(campaign_id, position);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_email ON campaign_sends(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);

-- ── Trigger updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaigns_updated_at();

-- ── RLS : service_role uniquement (pas de policy publique) ────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

-- ── Extensions newsletter_subscribers ─────────────────────────
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS enrolled_campaign_id uuid REFERENCES campaigns(id);
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS campaign_step integer DEFAULT 0;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz;

-- ── Extensions ebooks (lead magnet) ───────────────────────────
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS lead_magnet_url text;
ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS lead_magnet_description text;
