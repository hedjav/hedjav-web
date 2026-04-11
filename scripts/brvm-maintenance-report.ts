#!/usr/bin/env node
/**
 * scripts/brvm-maintenance-report.ts
 *
 * Génère un rapport de maintenance complet et l'écrit dans un fichier
 * `.brvm-reports/report-YYYY-MM-DDTHH-MM-SS.md` (gitignored) au format Markdown.
 *
 * À lancer manuellement ou via cron hebdo. Différent de brvm-health-check.ts
 * qui est rapide et silencieux, celui-ci produit un rapport archivable pour
 * suivi dans le temps.
 *
 * Usage :
 *   npx tsx scripts/brvm-maintenance-report.ts
 *   npx tsx scripts/brvm-maintenance-report.ts --stdout   # pas d'écriture fichier, juste stdout
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { generateMaintenanceReport, type MaintenanceReport } from '../lib/brvm/maintenance'

function statusBadge(s: string): string {
  return s === 'ok' ? '🟢' : s === 'warning' ? '🟡' : s === 'critical' ? '🔴' : '⚪'
}

function formatMarkdown(report: MaintenanceReport): string {
  const lines: string[] = []
  const ts = report.generated_at

  lines.push(`# BRVM — Rapport de maintenance ${ts}`)
  lines.push('')
  lines.push(`**État global** : ${statusBadge(report.overall_status)} ${report.overall_status.toUpperCase()}`)
  lines.push('')
  lines.push(`Checks : 🟢 ${report.summary.checks_passed}  🟡 ${report.summary.checks_warning}  🔴 ${report.summary.checks_critical}`)
  lines.push('')

  lines.push('## Checks')
  lines.push('')
  lines.push('| Statut | Check | Détail |')
  lines.push('|---|---|---|')
  for (const c of report.checks) {
    lines.push(`| ${statusBadge(c.status)} | ${c.label} | ${c.detail} |`)
  }
  lines.push('')

  if (report.sources.length > 0) {
    lines.push('## Sources')
    lines.push('')
    lines.push('| Source | Priority | Dernier succès (h) | Dernière erreur | Statut |')
    lines.push('|---|---|---|---|---|')
    for (const s of report.sources) {
      const h = s.hours_since_last_success
        ? s.hours_since_last_success.toFixed(1)
        : 'jamais'
      const err = s.last_error ? `\`${s.last_error.slice(0, 80).replace(/\|/g, '\\|')}\`` : '—'
      lines.push(`| ${s.slug} | ${s.priority} | ${h} | ${err} | ${statusBadge(s.status)} |`)
    }
    lines.push('')
  }

  lines.push('## Documents')
  lines.push('')
  lines.push(`- **Total** : ${report.documents.total}`)
  lines.push(`- **Découverts < 24h** : ${report.documents.new_today}`)
  lines.push(`- **Découverts < 7j** : ${report.documents.new_7d}`)
  lines.push(`- **Non traités** : ${report.documents.unprocessed}`)
  lines.push(`- **Dernière date de document** : ${report.documents.latest_doc_date ?? '—'}`)
  lines.push(`- **Dernière découverte** : ${report.documents.latest_discovered_at ?? '—'}`)
  lines.push(`- **PDFs archivés** : ${report.documents.pdfs_archived} / ${report.documents.total}`)
  lines.push('')
  lines.push('### Par type')
  lines.push('')
  lines.push('| Type | Count |')
  lines.push('|---|---|')
  for (const [type, count] of Object.entries(report.documents.by_type)) {
    if (count > 0) lines.push(`| ${type} | ${count} |`)
  }
  lines.push('')

  if (Object.keys(report.documents.by_source).length > 0) {
    lines.push('### Par source')
    lines.push('')
    for (const [source, count] of Object.entries(report.documents.by_source)) {
      lines.push(`- **${source}** : ${count}`)
    }
    lines.push('')
  }

  if (report.recommendations.length > 0) {
    lines.push('## Recommandations')
    lines.push('')
    for (const r of report.recommendations) {
      lines.push(`- ${r}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(`*Généré par scripts/brvm-maintenance-report.ts à ${ts}*`)

  return lines.join('\n')
}

async function main() {
  const stdoutOnly = process.argv.includes('--stdout')

  console.log('[brvm-maintenance-report] Génération du rapport…')
  const report = await generateMaintenanceReport()
  const md = formatMarkdown(report)

  if (stdoutOnly) {
    process.stdout.write(md)
    return
  }

  // Écriture fichier dans .brvm-reports/ (gitignored)
  const dir = path.resolve(process.cwd(), '.brvm-reports')
  await mkdir(dir, { recursive: true })
  const fileName = `report-${report.generated_at.replace(/[:.]/g, '-')}.md`
  const fullPath = path.join(dir, fileName)
  await writeFile(fullPath, md, 'utf8')

  console.log(`[brvm-maintenance-report] Rapport écrit : ${fullPath}`)
  console.log(`  État : ${report.overall_status.toUpperCase()}`)
  console.log(
    `  Checks : ✓ ${report.summary.checks_passed}  ! ${report.summary.checks_warning}  ✗ ${report.summary.checks_critical}`
  )
}

main().catch((e) => {
  console.error('[brvm-maintenance-report] Fatal:', e)
  process.exit(1)
})
