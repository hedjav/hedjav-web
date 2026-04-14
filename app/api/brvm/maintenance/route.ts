import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { generateMaintenanceReport } from '@/lib/brvm/maintenance'
import { createNotification } from '@/lib/notifications/queries'

/**
 * GET /api/brvm/maintenance
 *
 * Rapport de santé complet du système BRVM + transformation en vraie
 * supervision active : génère une notification admin quand le statut
 * bascule vers warning / critical, sans spammer (dédup 6h).
 *
 * Appelé par :
 *  - /admin/brvm/maintenance (UI)
 *  - scripts/brvm-health-check.ts (CLI)
 *  - cron externe toutes les 30 min
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
    const report = await generateMaintenanceReport()

    // Supervision : si overall_status != ok, on crée une notif admin
    // (une seule fois par statut/6h pour ne pas spammer).
    if (report.overall_status === 'warning' || report.overall_status === 'critical') {
      await raiseAlertIfNeeded(report.overall_status, report)
    }

    return NextResponse.json({ ok: true, report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[api/brvm/maintenance] error:', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

type MaintenanceReport = Awaited<ReturnType<typeof generateMaintenanceReport>>

async function raiseAlertIfNeeded(
  level: 'warning' | 'critical',
  report: MaintenanceReport,
) {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // Dédup : s'il existe déjà une notif brvm_alert du même niveau créée
    // depuis moins de 6h, on n'en crée pas une nouvelle.
    const sinceIso = new Date(Date.now() - 6 * 3600 * 1000).toISOString()
    const { data: recent } = await db
      .from('admin_notifications')
      .select('id')
      .eq('type', 'brvm_alert')
      .eq('metadata->>level', level)
      .gte('created_at', sinceIso)
      .limit(1)

    if (recent && recent.length > 0) return

    const failingChecks = report.checks.filter((c) => c.status === level)
    const summary = failingChecks.length > 0
      ? failingChecks.slice(0, 3).map((c) => c.detail).join(' · ')
      : `${report.summary.checks_warning} warning(s), ${report.summary.checks_critical} critical(s)`

    await createNotification(
      'brvm_alert',
      level === 'critical'
        ? 'Supervision BRVM : incident critique'
        : 'Supervision BRVM : anomalie détectée',
      summary,
      {
        metadata: {
          level,
          checks_passed: report.summary.checks_passed,
          checks_warning: report.summary.checks_warning,
          checks_critical: report.summary.checks_critical,
          failing_ids: failingChecks.map((c) => c.id),
        },
        priority: level === 'critical' ? 'urgent' : 'high',
        target_url: '/admin/brvm/maintenance',
        entity_type: 'brvm_maintenance',
      },
    )
  } catch (e) {
    // Ne jamais bloquer la route de supervision sur un souci notif.
    console.error('[api/brvm/maintenance] raiseAlertIfNeeded failed', e)
  }
}
