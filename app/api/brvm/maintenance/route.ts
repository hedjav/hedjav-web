import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { generateMaintenanceReport } from '@/lib/brvm/maintenance'

/**
 * GET /api/brvm/maintenance
 *
 * Retourne un rapport de santé complet du système BRVM.
 * Utilisé par :
 *  - /admin/brvm/maintenance (page admin V2)
 *  - scripts/brvm-health-check.ts (CLI via Bearer token)
 *  - monitoring externe (cron 30min recommandé)
 *
 * Auth : session admin OU Bearer INTERNAL_API_TOKEN
 *
 * Réponse : { ok: true, report: MaintenanceReport }
 */
export async function GET(request: Request) {
  // Auth : admin session OU token interne
  const tokenCheck = checkInternalToken(request)
  if (tokenCheck) {
    // Pas de token → fallback admin session
    const { response } = await checkAdminSession()
    if (response) return response
  }

  try {
    const report = await generateMaintenanceReport()
    return NextResponse.json({ ok: true, report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[api/brvm/maintenance] error:', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
