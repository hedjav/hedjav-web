-- ============================================================
-- MIGRATION 018 — Corrections textes Hermann
-- Mise à jour site_config + page à-propos
-- ============================================================

-- -------------------------------------------------------
-- 1. HERO — Page d'accueil
-- -------------------------------------------------------

UPDATE site_config SET value = 'Passionné par la finance et l''innovation, j''aide particuliers, entrepreneurs et cadres d''Afrique francophone à mieux décider, mieux investir et bâtir un patrimoine durable.'
WHERE key = 'hero_tagline';

-- -------------------------------------------------------
-- 2. SECTION NEWSLETTER
-- -------------------------------------------------------

UPDATE site_config SET value = 'Rejoignez notre communauté'
WHERE key = 'newsletter_title';

UPDATE site_config SET value = 'Recevez chaque semaine des analyses BRVM, des guides patrimoniaux UEMOA, un décryptage de l''actualité de l''IA, ainsi qu''un accès anticipé à nos nouveaux ebooks et formations.'
WHERE key = 'newsletter_subtitle';

-- -------------------------------------------------------
-- 3. SECTION FONDATEUR
-- -------------------------------------------------------

UPDATE site_config SET value = 'Analyste financier avec 13 ans d''expérience, Hermann Djossè AVAHOUIN a accompagné des centaines de cadres, d''entrepreneurs et de familles en Afrique de l''Ouest sur des enjeux de financement, d''investissement et de gestion de patrimoine.
Aujourd''hui à la tête de KTALYZ Conseils, il pilote l''école de gestion de Patrimoine (EGP), une formation en ligne dédiée à l''éducation financière et patrimoniale dans l''espace UEMOA. À travers des ebooks, des formations sur la bourse (BRVM), des analyses exclusives et des outils patrimoniaux, il rend accessible une expertise longtemps réservée à une minorité.
Sa mission est claire : faire émerger une véritable culture patrimoniale, ancrée dans les réalités fiscales, économiques et culturelles de l''Afrique francophone — approche conçue par des Africains, pour des Africains.'
WHERE key = 'fondateur_bio';

UPDATE site_config SET value = '13 ans d''expérience en analyse financière'
WHERE key = 'fondateur_bullet_1';

UPDATE site_config SET value = 'Fondateur de KTALYZ Conseils à Cotonou'
WHERE key = 'fondateur_bullet_2';

UPDATE site_config SET value = 'Expert BRVM, fiscalité OHADA et structuration patrimoniale'
WHERE key = 'fondateur_bullet_3';

UPDATE site_config SET value = 'Auteur d''ebooks et de formations sur la finance en zone UEMOA'
WHERE key = 'fondateur_bullet_4';

-- -------------------------------------------------------
-- 4. SECTION FINAL CTA
-- -------------------------------------------------------

UPDATE site_config SET value = 'Prêt à construire un patrimoine solide ?'
WHERE key = 'finalcta_title';

UPDATE site_config SET value = 'Découvrez nos ebooks pratiques, nos guides BRVM, nos contenus sur l''intelligence artificielle et nos premières formations en ligne, pensés pour l''Afrique.'
WHERE key = 'finalcta_subtitle';

-- -------------------------------------------------------
-- 5. FOOTER (ajouter clé si pas existante)
-- -------------------------------------------------------

INSERT INTO site_config (key, value, type, category, label, description)
VALUES (
  'footer_description',
  'École en ligne dédiée à la gestion de patrimoine, avec des ebooks, des formations BRVM et des analyses patrimoniales adaptées à l''Afrique.',
  'text', 'layout', 'Description footer', 'Texte descriptif dans le pied de page'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- -------------------------------------------------------
-- 6. PAGE À PROPOS (table pages)
-- -------------------------------------------------------

UPDATE pages SET
  title = 'À propos de EGP',
  body = '## À propos de EGP

EGP, c''est l''expertise patrimoniale de Hermann D. AVAHOUIN au service des particuliers et entrepreneurs d''Afrique francophone.

## L''histoire derrière EGP

EGP est née d''un constat simple : en Afrique francophone, l''accès à un conseil patrimonial indépendant, compétent et réellement adapté aux réalités locales demeure rare. Beaucoup trop rare.

D''un côté, les banques proposent principalement leurs propres produits. De l''autre, une grande partie des contenus financiers disponibles s''inspire de modèles occidentaux, souvent déconnectés des réalités économiques, fiscales et culturelles de notre environnement. Entre les deux, des cadres, des entrepreneurs et des familles cherchent à construire leur patrimoine, sans repères clairs ni accompagnement adapté.

C''est pour répondre à ce besoin qu''EGP a vu le jour.

## Hermann D. AVAHOUIN — Le fondateur

Fort de 13 ans d''expérience dans la finance ouest-africaine, Hermann D. AVAHOUIN met son expertise au service de celles et ceux qui veulent structurer, protéger et faire grandir leur patrimoine avec méthode.

Analyste financier de formation, il a accompagné pendant de nombreuses années des clients sur des problématiques de financement, d''investissement et de gestion de patrimoine.

Aujourd''hui à la tête de KTALYZ Conseils, il met cette expérience au service des particuliers et des entrepreneurs francophones à travers un accompagnement patrimonial sur mesure, des formations pratiques sur la BRVM, l''immobilier et la structuration patrimoniale, ainsi que des publications accessibles et ancrées dans les réalités africaines.

## Notre vision

Démocratiser une expertise patrimoniale longtemps réservée à une minorité, en l''ancrant dans les réalités fiscales, économiques et culturelles du continent.

**Concrètement :**

- Du contenu en français, pas une traduction d''articles US
- Des exemples chiffrés en FCFA
- Un cadre juridique OHADA
- Des stratégies testées sur le terrain',
  meta_description = 'EGP — École en ligne de la gestion de patrimoine pour l''Afrique francophone. Fondée par Hermann D. AVAHOUIN, analyste financier avec 13 ans d''expérience.'
WHERE slug = 'a-propos';
