#!/usr/bin/env node
/**
 * scripts/download-brvm-pdfs.ts
 *
 * CLI pour télécharger massivement les PDFs BRVM par période.
 *
 * Exemples :
 *   # Tous les BOC de janvier 2026
 *   npx tsx scripts/download-brvm-pdfs.ts \
 *     --from=2026-01-01 --to=2026-01-31 --types=boc
 *
 *   # Les rapports annuels de 2025
 *   npx tsx scripts/download-brvm-pdfs.ts \
 *     --from=2025-01-01 --to=2025-12-31 --types=rapport_annuel --limit=100
 *
 *   # Dry-run : liste ce qui serait téléchargé sans lancer les fetches
 *   npx tsx scripts/download-brvm-pdfs.ts --from=2026-01-01 --to=2026-04-10 --dry-run
 *
 *   # Tout (par défaut : 50 derniers)
 *   npx tsx scripts/download-brvm-pdfs.ts
 *
 * Prérequis :
 *   - Variables d'env : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 023_brvm_clean_reset.sql appliquée
 *   - Bucket Supabase Storage `brvm-documents` existant (créé par migration 020/023)
 *
 * Le script est idempotent : re-lancer = les docs déjà archivés sont skipped.
 * Pour re-télécharger : ajouter --force.
 */

import {
  downloadByPeriod,
  listDocumentsForDownload,
  type DownloadRequest,
} from '../lib/brvm/pdf-downloader'
import { DOC_TYPES, type DocType } from '../lib/brvm/types'

/* ─── Parsing CLI ─────────────────────────────────────────────── */

function parseArgs(): DownloadRequest & { dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2)
  const out: DownloadRequest & { dryRun: boolean; verbose: boolean } = {
    dryRun: false,
    verbose: false,
  }

  for (const arg of args) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--verbose' || arg === '-v') out.verbose = true
    else if (arg === '--force') out.force = true
    else if (arg.startsWith('--from=')) out.date_from = arg.slice(7)
    else if (arg.startsWith('--to=')) out.date_to = arg.slice(5)
    else if (arg.startsWith('--limit=')) out.limit = Number(arg.slice(8))
    else if (arg.startsWith('--types=')) {
      const types = arg.slice(8).split(',').map((t) => t.trim())
      const invalid = types.filter((t) => !(DOC_TYPES as readonly string[]).includes(t))
      if (invalid.length > 0) {
        console.error(`[download-brvm-pdfs] doc_types invalides: ${invalid.join(', ')}`)
        console.error(`Valides: ${DOC_TYPES.join(', ')}`)
        process.exit(2)
      }
      out.doc_types = types as DocType[]
    } else if (arg.startsWith('--sources=')) {
      out.source_slugs = arg.slice(10).split(',').map((s) => s.trim())
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      console.error(`[download-brvm-pdfs] argument inconnu: ${arg}`)
      printHelp()
      process.exit(2)
    }
  }

  return out
}

function printHelp() {
  console.log(`
scripts/download-brvm-pdfs.ts — Téléchargeur PDF BRVM par période

Usage :
  npx tsx scripts/download-brvm-pdfs.ts [options]

Options :
  --from=YYYY-MM-DD     Date début (doc_date)
  --to=YYYY-MM-DD       Date fin (doc_date)
  --types=a,b,c         DocTypes à inclure (défaut: tous)
                        Valides: ${DOC_TYPES.join(', ')}
  --sources=slug1,slug2 Sources à inclure (défaut: toutes)
                        Valides: brvm-org, bfin, sikafinance
  --limit=N             Max PDFs à traiter (défaut 50, max 500)
  --force               Re-télécharger même si déjà archivé
  --dry-run             Liste seulement, ne télécharge rien
  --verbose, -v         Affiche chaque item (au lieu du résumé)

Exemples :
  # Tous les BOC de janvier 2026
  npx tsx scripts/download-brvm-pdfs.ts --from=2026-01-01 --to=2026-01-31 --types=boc

  # Simuler sans télécharger
  npx tsx scripts/download-brvm-pdfs.ts --from=2026-01-01 --to=2026-04-10 --dry-run
`)
}

/* ─── Main ────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function main() {
  const args = parseArgs()
  const { dryRun, verbose, ...request } = args

  console.log('[download-brvm-pdfs] Paramètres :')
  console.log(`  Période       : ${request.date_from ?? '(début)'} → ${request.date_to ?? '(aujourd\'hui)'}`)
  console.log(`  Types         : ${request.doc_types?.join(', ') ?? 'tous'}`)
  console.log(`  Sources       : ${request.source_slugs?.join(', ') ?? 'toutes'}`)
  console.log(`  Limit         : ${request.limit ?? 50}`)
  console.log(`  Force         : ${request.force ? 'oui' : 'non'}`)
  console.log(`  Mode          : ${dryRun ? 'DRY-RUN (aucun téléchargement)' : 'RÉEL'}`)
  console.log('')

  if (dryRun) {
    const docs = await listDocumentsForDownload(request)
    console.log(`[DRY-RUN] ${docs.length} documents correspondent à la requête :\n`)
    docs.slice(0, 50).forEach((d, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(3)}. [${d.doc_type.padEnd(20)}] ${d.doc_date ?? '(sans date)'} — ${d.title.slice(0, 70)}`
      )
      if (d.pdf_url) console.log(`       ${d.pdf_url}`)
    })
    if (docs.length > 50) console.log(`  ... et ${docs.length - 50} de plus`)
    console.log('\n[DRY-RUN] Aucun téléchargement effectué.')
    return
  }

  console.log('[download-brvm-pdfs] Lancement des téléchargements…\n')
  const report = await downloadByPeriod(request)

  // Résumé
  console.log('\n[download-brvm-pdfs] Rapport :')
  console.log(`  Total matchés     : ${report.total_matched}`)
  console.log(`  Traités           : ${report.total_processed}`)
  console.log(`  ✓ Téléchargés     : ${report.counts.downloaded}`)
  console.log(`  ↷ Déjà archivés   : ${report.counts.skipped_already_archived}`)
  console.log(`  ○ Sans URL PDF    : ${report.counts.skipped_no_pdf_url}`)
  console.log(`  ⊘ Introuvables    : ${report.counts.missing}`)
  console.log(`  ✗ Erreurs         : ${report.counts.error}`)
  console.log(`  Durée             : ${(report.duration_ms / 1000).toFixed(1)}s`)

  if (verbose || report.counts.error > 0 || report.counts.missing > 0) {
    console.log('\n[download-brvm-pdfs] Détails :')
    for (const item of report.items) {
      const icon =
        item.status === 'downloaded'
          ? '✓'
          : item.status === 'skipped_already_archived'
            ? '↷'
            : item.status === 'skipped_no_pdf_url'
              ? '○'
              : item.status === 'missing'
                ? '⊘'
                : '✗'
      const size = item.file_size ? ` ${formatBytes(item.file_size)}` : ''
      console.log(
        `  ${icon} [${item.status.padEnd(26)}] ${item.doc_type.padEnd(20)} ${item.title.slice(0, 60)}${size}`
      )
      if (item.error) console.log(`       → ${item.error}`)
    }
  }

  // Exit code non nul si beaucoup d'erreurs
  if (report.counts.error > report.counts.downloaded / 2) {
    console.error(
      '\n[download-brvm-pdfs] ⚠ Plus d\'erreurs que de succès — la source est peut-être down.'
    )
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('[download-brvm-pdfs] Fatal:', e)
  process.exit(1)
})
