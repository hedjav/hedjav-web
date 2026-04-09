-- 013 — Table site_config : configuration dynamique du site
CREATE TABLE IF NOT EXISTS site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text','number','boolean','json','url','email')),
  category text DEFAULT 'general',
  label text,
  description text,
  metadata jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- RLS
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les configs sont visibles côté front)
CREATE POLICY "site_config_read_all" ON site_config FOR SELECT USING (true);

-- Écriture admin only (via service_role, pas de policy INSERT/UPDATE pour anon)
CREATE POLICY "site_config_admin_write" ON site_config FOR ALL
  USING (true) WITH CHECK (true);

-- Configs initiales
INSERT INTO site_config (key, value, type, category, label, description) VALUES
  ('site_name', 'Hedjav', 'text', 'general', 'Nom du site', 'Nom affiché dans le header et les emails'),
  ('site_tagline', 'École en ligne de la Gestion de Patrimoine — Zone UEMOA', 'text', 'general', 'Tagline', 'Sous-titre du site'),
  ('hero_title', 'Bâtissez. Protégez. Transmettez.', 'text', 'hero', 'Titre hero', 'Titre principal de la page d''accueil'),
  ('hero_subtitle', 'La première école en ligne dédiée à la gestion de patrimoine en zone UEMOA.', 'text', 'hero', 'Sous-titre hero', 'Texte sous le titre hero'),
  ('hero_cta_primary', 'Voir les ebooks', 'text', 'hero', 'CTA principal', 'Texte du bouton principal hero'),
  ('hero_cta_secondary', 'Lire le blog', 'text', 'hero', 'CTA secondaire', 'Texte du bouton secondaire hero'),
  ('founder_name', 'Hermann D. AVAHOUIN', 'text', 'founder', 'Nom du fondateur', 'Nom complet affiché dans la section fondateur'),
  ('founder_title', 'Analyste financier — 17 ans d''expérience BOA Bénin — Fondateur KTALYZ Conseils', 'text', 'founder', 'Titre du fondateur', 'Titre professionnel du fondateur'),
  ('contact_email', 'hedjav@gmail.com', 'email', 'contact', 'Email de contact', 'Email public affiché sur le site'),
  ('contact_whatsapp', '+22901978903630', 'text', 'contact', 'WhatsApp', 'Numéro WhatsApp avec indicatif'),
  ('social_facebook', 'https://facebook.com/hedjav', 'url', 'social', 'Facebook', 'URL page Facebook'),
  ('social_instagram', 'https://instagram.com/hedjav', 'url', 'social', 'Instagram', 'URL profil Instagram'),
  ('social_x', 'https://x.com/hedjav', 'url', 'social', 'X (Twitter)', 'URL profil X'),
  ('social_tiktok', 'https://tiktok.com/@hedjav', 'url', 'social', 'TikTok', 'URL profil TikTok'),
  ('revenue_target_monthly', '500000', 'number', 'kpi', 'Objectif revenu mensuel', 'Objectif de revenu mensuel en FCFA'),
  ('members_target_monthly', '50', 'number', 'kpi', 'Objectif membres/mois', 'Nombre de nouveaux membres visé par mois'),
  ('conversion_target', '5', 'number', 'kpi', 'Objectif conversion %', 'Taux de conversion cible en pourcentage'),
  ('company_name', 'KTALYZ SARL', 'text', 'legal', 'Raison sociale', 'Nom légal de l''entreprise'),
  ('company_address', 'Cotonou, Bénin', 'text', 'legal', 'Adresse', 'Adresse de l''entreprise')
ON CONFLICT (key) DO NOTHING;
