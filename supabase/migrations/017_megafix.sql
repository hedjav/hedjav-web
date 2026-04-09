-- ============================================================
-- MIGRATION 017 — MEGA-FIX
-- hedjav.com — egp.hedjav.com
-- Date: Avril 2026
-- ============================================================

-- -------------------------------------------------------
-- 1. NORMALISATION EMAIL (anti-doublons + alias Gmail)
-- -------------------------------------------------------

-- Fonction de normalisation email
CREATE OR REPLACE FUNCTION normalize_email(raw_email text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  local_part text;
  domain_part text;
  normalized text;
BEGIN
  raw_email := lower(trim(raw_email));
  local_part := split_part(raw_email, '@', 1);
  domain_part := split_part(raw_email, '@', 2);

  -- Gmail et Googlemail : supprimer les points et le +tag
  IF domain_part IN ('gmail.com', 'googlemail.com') THEN
    local_part := split_part(local_part, '+', 1);
    local_part := replace(local_part, '.', '');
    domain_part := 'gmail.com'; -- normaliser googlemail → gmail
  -- Outlook/Hotmail/Live : supprimer le +tag uniquement
  ELSIF domain_part IN ('outlook.com', 'hotmail.com', 'live.com', 'hotmail.fr') THEN
    local_part := split_part(local_part, '+', 1);
  -- Yahoo : supprimer le -tag (Yahoo utilise - au lieu de +)
  ELSIF domain_part LIKE '%yahoo.%' THEN
    local_part := split_part(local_part, '-', 1);
  ELSE
    -- Autres providers : supprimer le +tag par sécurité
    local_part := split_part(local_part, '+', 1);
  END IF;

  RETURN local_part || '@' || domain_part;
END;
$$;

-- Ajouter colonne email normalisé sur newsletter_subscribers
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS email_normalized text;

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS subscriber_type text DEFAULT 'editorial'
  CHECK (subscriber_type IN ('editorial', 'lead_magnet', 'both'));

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS lead_magnet_ebook_id uuid REFERENCES ebooks(id);

-- Remplir les emails normalisés existants
UPDATE newsletter_subscribers
SET email_normalized = normalize_email(email)
WHERE email_normalized IS NULL;

-- Index unique sur email normalisé pour empêcher les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email_normalized
  ON newsletter_subscribers(email_normalized)
  WHERE is_active = true;

-- Trigger pour auto-normaliser à chaque insert/update
CREATE OR REPLACE FUNCTION trg_normalize_subscriber_email()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.email_normalized := normalize_email(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_subscriber_email ON newsletter_subscribers;
CREATE TRIGGER normalize_subscriber_email
  BEFORE INSERT OR UPDATE OF email ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_subscriber_email();

-- -------------------------------------------------------
-- 2. NOTIFICATIONS AUTOMATIQUES — Triggers métier
-- -------------------------------------------------------

-- Ajouter colonnes pour email notification
ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Fonction helper pour créer une notification admin
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  notif_id uuid;
BEGIN
  INSERT INTO admin_notifications (type, title, message, priority, metadata, is_read)
  VALUES (p_type, p_title, p_message, p_priority, p_metadata, false)
  RETURNING id INTO notif_id;

  RETURN notif_id;
END;
$$;

-- Trigger : notification sur nouvel achat
CREATE OR REPLACE FUNCTION trg_notify_new_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ebook_title text;
  buyer_name text;
BEGIN
  -- Seulement quand le statut passe à 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT title INTO ebook_title FROM ebooks WHERE id = NEW.ebook_id;
    SELECT full_name INTO buyer_name FROM profiles WHERE id = NEW.user_id;

    PERFORM create_admin_notification(
      'purchase',
      'Nouvel achat !',
      format('🎉 %s a acheté "%s" pour %s FCFA',
        COALESCE(buyer_name, NEW.email),
        COALESCE(ebook_title, 'Ebook'),
        NEW.amount
      ),
      'high',
      jsonb_build_object(
        'purchase_id', NEW.id,
        'ebook_id', NEW.ebook_id,
        'amount', NEW.amount,
        'email', NEW.email,
        'requires_email', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_purchase ON purchases;
CREATE TRIGGER notify_new_purchase
  AFTER INSERT OR UPDATE OF status ON purchases
  FOR EACH ROW EXECUTE FUNCTION trg_notify_new_purchase();

-- Trigger : notification sur nouvelle inscription (nouveau profil)
CREATE OR REPLACE FUNCTION trg_notify_new_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM create_admin_notification(
    'registration',
    'Nouvelle inscription',
    format('👤 %s (%s) vient de s''inscrire',
      COALESCE(NEW.full_name, 'Utilisateur'),
      NEW.email
    ),
    'normal',
    jsonb_build_object(
      'profile_id', NEW.id,
      'email', NEW.email,
      'full_name', NEW.full_name,
      'requires_email', true
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_registration ON profiles;
CREATE TRIGGER notify_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_notify_new_registration();

-- Trigger : notification sur inscription newsletter
CREATE OR REPLACE FUNCTION trg_notify_new_subscriber()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM create_admin_notification(
    'newsletter',
    'Nouvel abonné newsletter',
    format('📩 %s s''est inscrit à la newsletter (%s)',
      COALESCE(NEW.first_name, NEW.email),
      NEW.subscriber_type
    ),
    'low',
    jsonb_build_object(
      'subscriber_email', NEW.email,
      'subscriber_type', NEW.subscriber_type,
      'source', NEW.source,
      'requires_email', true
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_subscriber ON newsletter_subscribers;
CREATE TRIGGER notify_new_subscriber
  AFTER INSERT ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION trg_notify_new_subscriber();

-- Trigger : notification sur désinscription newsletter
CREATE OR REPLACE FUNCTION trg_notify_unsubscribe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    PERFORM create_admin_notification(
      'unsubscribe',
      'Désinscription newsletter',
      format('📤 %s s''est désinscrit de la newsletter', OLD.email),
      'normal',
      jsonb_build_object(
        'subscriber_email', OLD.email,
        'requires_email', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_unsubscribe ON newsletter_subscribers;
CREATE TRIGGER notify_unsubscribe
  AFTER UPDATE OF is_active ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION trg_notify_unsubscribe();

-- -------------------------------------------------------
-- 3. SITE_CONFIG — Nouvelles clés pour CMS + cookies
-- -------------------------------------------------------

-- Clés cookie banner
INSERT INTO site_config (key, value, type, category, label, description) VALUES
  ('cookie_message', 'Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous acceptez notre politique de confidentialité.', 'text', 'legal', 'Message bandeau cookies', 'Texte affiché dans le bandeau cookies'),
  ('cookie_accept_text', 'Accepter', 'text', 'legal', 'Bouton accepter cookies', 'Texte du bouton accepter'),
  ('cookie_reject_text', 'Refuser', 'text', 'legal', 'Bouton refuser cookies', 'Texte du bouton refuser'),
  ('cookie_policy_url', '/mentions-legales', 'url', 'legal', 'Lien politique cookies', 'URL vers la page politique de cookies'),

-- Clés Hero
  ('hero_tagline', 'Maîtrisez votre patrimoine. Investissez avec méthode.', 'text', 'homepage', 'Hero tagline', 'Slogan principal de la page d''accueil'),
  ('hero_badge_1', 'Gestion de patrimoine', 'text', 'homepage', 'Badge Hero 1', 'Premier badge du hero'),
  ('hero_badge_2', 'Investissement BRVM', 'text', 'homepage', 'Badge Hero 2', 'Deuxième badge du hero'),
  ('hero_badge_3', 'Ebooks pratiques', 'text', 'homepage', 'Badge Hero 3', 'Troisième badge du hero'),
  ('hero_badge_4', 'Zone UEMOA', 'text', 'homepage', 'Badge Hero 4', 'Quatrième badge du hero'),

-- Clés Section Approche
  ('approche_title', 'Notre Approche', 'text', 'homepage', 'Titre section approche', ''),
  ('approche_subtitle', 'Une méthodologie éprouvée pour construire et protéger votre patrimoine', 'text', 'homepage', 'Sous-titre section approche', ''),
  ('approche_pilier_1_title', 'Éducation', 'text', 'homepage', 'Pilier 1 titre', ''),
  ('approche_pilier_1_desc', 'Apprenez les fondamentaux de la gestion de patrimoine adaptés au contexte UEMOA.', 'text', 'homepage', 'Pilier 1 description', ''),
  ('approche_pilier_2_title', 'Stratégie', 'text', 'homepage', 'Pilier 2 titre', ''),
  ('approche_pilier_2_desc', 'Définissez une stratégie patrimoniale personnalisée et réaliste.', 'text', 'homepage', 'Pilier 2 description', ''),
  ('approche_pilier_3_title', 'Action', 'text', 'homepage', 'Pilier 3 titre', ''),
  ('approche_pilier_3_desc', 'Passez à l''action avec des outils concrets et un accompagnement expert.', 'text', 'homepage', 'Pilier 3 description', ''),

-- Clés Section Newsletter
  ('newsletter_title', 'Restez informé', 'text', 'homepage', 'Titre section newsletter', ''),
  ('newsletter_subtitle', 'Recevez nos analyses et conseils patrimoniaux 3 fois par semaine', 'text', 'homepage', 'Sous-titre section newsletter', ''),
  ('newsletter_disclaimer', 'Pas de spam. Désinscription en un clic.', 'text', 'homepage', 'Disclaimer newsletter', ''),

-- Clés Section Fondateur
  ('fondateur_bio', 'Hermann D. AVAHOUIN est analyste financier avec 17 ans d''expérience à la Bank of Africa Bénin. Fondateur de KTALYZ Conseils, il accompagne les particuliers et entreprises de la zone UEMOA dans la gestion et la valorisation de leur patrimoine.', 'text', 'homepage', 'Bio fondateur', ''),
  ('fondateur_bullet_1', '17 ans d''expérience bancaire (BOA Bénin)', 'text', 'homepage', 'Fondateur point 1', ''),
  ('fondateur_bullet_2', 'Expert analyse financière & patrimoine UEMOA', 'text', 'homepage', 'Fondateur point 2', ''),
  ('fondateur_bullet_3', 'Fondateur KTALYZ Conseils', 'text', 'homepage', 'Fondateur point 3', ''),
  ('fondateur_bullet_4', 'Vice-Président AASCOT BRVM Bénin', 'text', 'homepage', 'Fondateur point 4', ''),

-- Clés Section FinalCTA
  ('finalcta_title', 'Prêt à prendre le contrôle de votre patrimoine ?', 'text', 'homepage', 'Titre CTA final', ''),
  ('finalcta_subtitle', 'Commencez par nos ebooks gratuits et payants pour poser les bases.', 'text', 'homepage', 'Sous-titre CTA final', ''),

-- Clés notification email
  ('notification_email_enabled', 'true', 'boolean', 'notifications', 'Activer emails notification', 'Envoyer un email aux admins pour chaque notification importante'),
  ('notification_extra_emails', 'ktalyzconseils@gmail.com', 'text', 'notifications', 'Emails supplémentaires', 'Emails supplémentaires pour les notifications (séparés par des virgules)')
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------
-- 4. PASSWORD POLICY (stocké en config pour flexibilité)
-- -------------------------------------------------------

INSERT INTO site_config (key, value, type, category, label, description) VALUES
  ('password_min_length', '8', 'number', 'security', 'Longueur min mot de passe', 'Nombre minimum de caractères'),
  ('password_require_uppercase', 'true', 'boolean', 'security', 'Exiger majuscule', 'Au moins une lettre majuscule'),
  ('password_require_number', 'true', 'boolean', 'security', 'Exiger chiffre', 'Au moins un chiffre')
ON CONFLICT (key) DO NOTHING;
