import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { diagnoseBrvmOrg } from '@/lib/brvm/scrapers/brvm-org'

/**
 * GET /api/brvm/diagnose
 *
 * Diagnostic en temps réel de l'accessibilité de brvm.org et du nombre de
 * PDFs trouvés sur chaque section (BOC, rapports, annonces). N'insère rien
 * en base.
 *
 * Utile pour débugger quand le scraper ramène 0 : on voit immédiatement si
 * une URL est 404, si le HTML est une page d'erreur déguisée, combien de
 * liens PDF sont trouvés, etc.
 *
 * Auth : session admin OU Bearer INTERNAL_API_TOKEN.
 */
export async function GET(request: Request) {
  const tokenCheck = checkInternalToken(request)
  if (tokenCheck) {
    const { response } = await checkAdminSession()
    if (response) return response
  }

  try {
    const sections = await diagnoseBrvmOrg()
    const totalPdfs = sections.reduce((sum, s) => sum + s.pdf_links_found, 0)
    const errorsCount = sections.filter((s) => s.error || s.pdf_links_found === 0).length

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary: {
        sections_scanned: sections.length,
        total_pdfs_found: totalPdfs,
        sections_with_error: errorsCount,
      },
      sections,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}
