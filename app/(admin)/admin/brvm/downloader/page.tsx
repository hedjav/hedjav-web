import { redirect } from 'next/navigation'

/**
 * L'ancien module /admin/brvm/downloader a été fusionné dans le Centre
 * de Veille BRVM (/admin/brvm) : le bouton « Archiver PDFs de la sélection »
 * prend en charge le téléchargement par période + types + source.
 *
 * On conserve cette route pour ne pas casser les bookmarks admin.
 */
export default function LegacyBrvmDownloaderPage() {
  redirect('/admin/brvm')
}
