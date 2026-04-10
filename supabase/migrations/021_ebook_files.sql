-- 021_ebook_files.sql
-- HOTFIX : activation de la livraison des ebooks après paiement FedaPay.
--
-- Contexte : la table ebooks n'avait aucun champ pour stocker le fichier PDF
-- du livrable. Résultat : les clients payaient mais ne recevaient rien.
--
-- Ce fichier :
--  1. Ajoute ebooks.file_path + file_size_bytes
--  2. Crée un bucket Supabase Storage PRIVÉ 'ebook-files'
--  3. Les téléchargements passent exclusivement par des signed URLs générées
--     côté serveur par /api/ebooks/download après vérification d'une purchase paid.
--  4. Aucune policy RLS d'accès public — le service-role est la seule voie.

-- 1. Colonnes pour stocker le fichier livrable
ALTER TABLE ebooks
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS file_uploaded_at timestamptz;

COMMENT ON COLUMN ebooks.file_path IS 'Chemin du PDF dans le bucket Supabase Storage ebook-files (ex: ebooks/ebook-abc.pdf)';
COMMENT ON COLUMN ebooks.file_size_bytes IS 'Taille du fichier en octets, pour UI (affichage Mo)';

-- 2. Bucket privé ebook-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebook-files',
  'ebook-files',
  false, -- PRIVÉ, jamais accessible en direct
  104857600, -- 100 MB max par fichier
  ARRAY['application/pdf', 'application/epub+zip', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies RLS du bucket : personne n'accède directement.
--    Le service-role bypass RLS automatiquement et génère des signed URLs.
--    Aucune policy de SELECT public → tout GET direct retournera 403.

-- Note : si besoin de permettre aux admins authentifiés d'uploader via l'UI,
-- la policy UPLOAD ci-dessous permet à un profile.role='admin' d'écrire.
-- L'upload côté serveur reste recommandé (via /api/admin/ebooks/upload-file
-- qui utilise le service-role) pour éviter d'exposer le chemin côté client.

DROP POLICY IF EXISTS "ebook_files_admin_upload" ON storage.objects;
CREATE POLICY "ebook_files_admin_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ebook-files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "ebook_files_admin_delete" ON storage.objects;
CREATE POLICY "ebook_files_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ebook-files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Pas de policy SELECT : les téléchargements clients passent UNIQUEMENT par
-- /api/ebooks/download (service-role + vérification purchase paid + signed URL).
