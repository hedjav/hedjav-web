#!/usr/bin/env node
/**
 * scripts/import-brvm-history.ts
 *
 * Importe l'historique des documents BRVM depuis le miroir HTTrack local
 * `hedjav-scrap/hedjav-scrap/www.brvm.org/`.
 *
 * ATTENTION :
 *   - Ce script est LOCAL UNIQUEMENT. Le dossier `hedjav-scrap/` est dans .gitignore
 *     et n'existe pas en production. Ne jamais l'exécuter sur le VPS.
 *   - Il lit uniquement les fichiers sous www.brvm.org/ (scope validé : brvm.org only).
 *   - Il utilise `upsertDocument()` qui déduplique par checksum SHA256.
 *     Re-lancer le script 10 fois = toujours le même nombre de lignes en base.
 *
 * Usage :
 *   npx tsx scripts/import-brvm-history.ts
 *   npx tsx scripts/import-brvm-history.ts --dry-run  # ne rien insérer
 *
 * Prérequis :
 *   - Variables d'env : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 020 appliquée (tables brvm_sources + brvm_documents)
 */

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { upsertDocument } from '../lib/brvm/documents'
import type { DocumentInput, DocType } from '../lib/brvm/types'

const MIRROR_ROOT = path.resolve(
  process.cwd(),
  'hedjav-scrap',
  'hedjav-scrap',
  'www.brvm.org'
)

const DRY_RUN = process.argv.includes('--dry-run')

/* ─── Helpers ───────────────────────────────────────────────────── */

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry)
    let st
    try {
      st = await stat(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      yield* walk(full)
    } else if (st.isFile()) {
      yield full
    }
  }
}

function extractBocDate(filename: string): string | null {
  const m = filename.match(/boc_(\d{4})(\d{2})(\d{2})/i)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function extractReportDate(filename: string): string | null {
  const m = filename.match(/^(\d{4})(\d{2})(\d{2})_/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function extractIssuerSlug(filename: string): string | null {
  // Patterns : 20251205_-_fs_-_air_liquide_ci_-_exercice_2025.pdf
  //            20251205_-_rapport_dactivites_-_1er_trimestre_2025_-_erium_ci.pdf
  const m1 = filename.match(/_fs_-_([a-z0-9_]+?)_-_/i)
  if (m1) return m1[1].replace(/_/g, '-')
  const m2 = filename.match(/_-_([a-z0-9_]+?)(?:\.pdf|_ex_)/i)
  if (m2) return m2[1].replace(/_/g, '-')
  return null
}

function classifyDocument(filename: string): DocType {
  const lower = filename.toLowerCase()
  if (lower.startsWith('boc_')) return 'boc'
  if (lower.includes('exercice') || lower.includes('rapport_annuel')) return 'rapport_annuel'
  if (lower.includes('semestr')) return 'rapport_semestriel'
  if (lower.includes('trimestr')) return 'rapport_trimestriel'
  if (lower.includes('communique')) return 'communique'
  if (lower.includes('note_information') || lower.includes('note_dinformation'))
    return 'note_information'
  if (lower.includes('avis')) return 'avis'
  if (lower.includes('rapport_dactivites') || lower.includes('rapport_dactivite'))
    return 'rapport_trimestriel'
  return 'annonce'
}

function humanTitle(filename: string, docType: DocType, docDate: string | null): string {
  if (docType === 'boc' && docDate) return `BOC du ${docDate}`
  // Clean filename : remove extension, replace underscores/hyphens with spaces, capitalize
  const base = filename.replace(/\.pdf$/i, '').replace(/_/g, ' ').replace(/-/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * À partir d'un fichier local, construit l'URL publique officielle sur brvm.org.
 * Pattern : www.brvm.org/sites/default/files/xxx.pdf
 */
function localPathToPublicUrl(fullPath: string): string {
  const relative = path.relative(MIRROR_ROOT, fullPath).split(path.sep).join('/')
  return `https://www.brvm.org/${relative}`
}

/* ─── Main ──────────────────────────────────────────────────────── */

async function main() {
  console.log(`[import-brvm-history] Miroir : ${MIRROR_ROOT}`)
  console.log(`[import-brvm-history] Mode : ${DRY_RUN ? 'DRY-RUN' : 'INSERT'}`)

  try {
    await stat(MIRROR_ROOT)
  } catch {
    console.error(`[import-brvm-history] ❌ Miroir introuvable : ${MIRROR_ROOT}`)
    console.error('   Vérifie que hedjav-scrap/ est présent localement (voir docs/BRVM_ADMIN.md).')
    process.exit(1)
  }

  const stats = {
    files_scanned: 0,
    pdfs_found: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    by_type: {} as Record<string, number>,
  }

  for await (const fullPath of walk(MIRROR_ROOT)) {
    stats.files_scanned++

    if (!fullPath.toLowerCase().endsWith('.pdf')) continue
    stats.pdfs_found++

    const filename = path.basename(fullPath)
    const docType = classifyDocument(filename)
    const docDate = extractBocDate(filename) ?? extractReportDate(filename)
    const title = humanTitle(filename, docType, docDate)
    const issuerSlug = extractIssuerSlug(filename)

    const pdfUrl = localPathToPublicUrl(fullPath)
    const sourceUrl =
      docType === 'boc'
        ? 'https://www.brvm.org/fr/bulletins-officiels-de-la-cote.html'
        : pdfUrl.replace(/\/sites\/default\/files\/.+$/, '/fr/')

    const input: DocumentInput = {
      source_slug: 'brvm-org',
      doc_type: docType,
      title,
      doc_date: docDate,
      source_url: sourceUrl,
      pdf_url: pdfUrl,
      issuer_slug: issuerSlug,
      metadata: {
        source: 'httrack-mirror',
        original_filename: filename,
        imported_at: new Date().toISOString(),
      },
    }

    if (DRY_RUN) {
      stats.inserted++
      stats.by_type[docType] = (stats.by_type[docType] ?? 0) + 1
      if (stats.inserted <= 10) {
        console.log(`  [DRY] ${docType.padEnd(20)} ${docDate ?? '          '} ${title}`)
      }
      continue
    }

    const res = await upsertDocument(input)
    if (res.status === 'inserted') {
      stats.inserted++
      stats.by_type[docType] = (stats.by_type[docType] ?? 0) + 1
      if (stats.inserted <= 20 || stats.inserted % 50 === 0) {
        console.log(`  ✓ ${docType.padEnd(20)} ${title}`)
      }
    } else if (res.status === 'skipped') {
      stats.skipped++
    } else {
      stats.errors++
      console.error(`  ✗ ${filename} : ${res.error}`)
    }
  }

  console.log('\n[import-brvm-history] Résumé :')
  console.log(`  Fichiers scannés : ${stats.files_scanned}`)
  console.log(`  PDFs trouvés     : ${stats.pdfs_found}`)
  console.log(`  Insérés          : ${stats.inserted}`)
  console.log(`  Skipped (dédup)  : ${stats.skipped}`)
  console.log(`  Erreurs          : ${stats.errors}`)
  console.log('  Par type :')
  for (const [type, count] of Object.entries(stats.by_type).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type.padEnd(22)} ${count}`)
  }
}

main().catch((e) => {
  console.error('[import-brvm-history] Fatal:', e)
  process.exit(1)
})
