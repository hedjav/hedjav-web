/**
 * Slug utilitaire partagé. Unifie la logique jusqu'ici dupliquée entre
 * /api/articles, /api/admin/generate-article et lib/admin/actions.
 */
export function articleSlug(input: string, maxLen = 120): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
}
