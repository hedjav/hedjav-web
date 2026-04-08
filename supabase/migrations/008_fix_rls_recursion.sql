-- ============================================================
-- hedjav.com — Migration 008 : fix récursion infinie RLS profiles
-- ============================================================
-- BUG : la policy "profiles_admin_read" déclarée en migration 003
-- contenait un SELECT depuis public.profiles à l'intérieur d'une
-- policy SELECT sur public.profiles → récursion infinie au runtime.
-- Conséquence : getCurrentProfile() renvoyait null pour TOUS les
-- users (admins inclus) → impossible d'accéder à /admin.
--
-- FIX : on supprime la policy récursive. Les vues admin (qui ont
-- besoin de lire TOUS les profils) utilisent déjà le service_role
-- via lib/admin/setup.ts et lib/admin/actions.ts qui bypass RLS.
-- ============================================================

drop policy if exists "profiles_admin_read" on public.profiles;
