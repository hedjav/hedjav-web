#!/usr/bin/env node
/**
 * scripts/brvm-health-check.ts
 *
 * Health check rapide du système BRVM. Affiche un rapport concis en texte.
 * Exit code non-zéro si problème critique → utilisable dans un cron de monitoring.
 *
 * Usage :
 *   npx tsx scripts/brvm-health-check.ts
 *   npx tsx scripts/brvm-health-check.ts --json       # sortie JSON
 *   npx tsx scripts/brvm-health-check.ts --quiet      # texte condensé
 *
 * Cron recommandé (toutes les 30 min, via cron-job.org ou PM2 cron) :
 *   GET https://egp.hedjav.com/api/brvm/maintenance
 *   Authorization: Bearer $INTERNAL_API_TOKEN
 *
 * Exit codes :
 *   0 = tout OK
 *   1 = warnings présents
 *   2 = critical présents
 */

import { generateMaintenanceReport, formatReportText } from '../lib/brvm/maintenance'

async function main() {
  const args = process.argv.slice(2)
  const asJson = args.includes('--json')
  const quiet = args.includes('--quiet')

  const report = await generateMaintenanceReport()

  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
  } else if (quiet) {
    console.log(
      `[brvm-health] ${report.overall_status.toUpperCase()} — ✓${report.summary.checks_passed} !${report.summary.checks_warning} ✗${report.summary.checks_critical} — ${report.documents.total} docs, ${report.documents.unprocessed} à traiter`
    )
  } else {
    console.log(formatReportText(report))
  }

  if (report.overall_status === 'critical') process.exit(2)
  if (report.overall_status === 'warning') process.exit(1)
  process.exit(0)
}

main().catch((e) => {
  console.error('[brvm-health-check] Fatal:', e)
  process.exit(3)
})
