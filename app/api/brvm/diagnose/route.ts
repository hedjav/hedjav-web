import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { diagnoseBrvmOrg } from '@/lib/brvm/scrapers/brvm-org'
import { getDownloaderDiagnostic } from '@/lib/brvm/pdf-downloader'

/**
 * GET /api/brvm/diagnose
 *
 * Diagnostic en temps réel en un seul appel :
 *  - `sections[]` : état live du scraping brvm.org (URL fetched, status, PDFs trouvés)
 *  - `db_snapshot` : contenu actuel de `brvm_documents` (total, par type, min/max date,
 *    5 derniers insérés)
 *
 * Utile pour débugger quand le downloader ramène 0 : on voit si le scraper marche
 * (sections > 0), si la base est peuplée (db_snapshot.db_total > 0), et si les
 * dates sont cohérentes avec la plage demandée.
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
    const [sections, dbSnapshot] = await Promise.all([
      diagnoseBrvmOrg(),
      getDownloaderDiagnostic().catch(() => null),
    ])

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
      db_snapshot: dbSnapshot,
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
