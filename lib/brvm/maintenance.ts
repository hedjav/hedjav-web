/**
 * Module maintenance BRVM.
 * Produit un rapport de santé complet du système BRVM :
 *  - tables présentes et peuplées
 *  - sources et leur dernier état de scraping
 *  - volume de documents et fraîcheur
 *  - nouveautés en attente de traitement
 *  - anomalies détectées (sources silencieuses, gaps BOC, etc.)
 *  - recommandations de correction concrètes
 *
 * Utilisé par /api/brvm/maintenance (JSON) et scripts/brvm-health-check.ts (texte).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DOC_TYPES, type DocType } from './types'

const EXPECTED_SOURCE_SLUGS = ['brvm-org', 'bfin', 'sikafinance'] as const

/* ── Types ─────────────────────────────────────────────────────── */

export type CheckStatus = 'ok' | 'warning' | 'critical' | 'unknown'

export type Check = {
  id: string
  label: string
  status: CheckStatus
  detail: string
  hint?: string // suggestion de correction
}

export type SourceHealth = {
  slug: string
  name: string
  priority: number
  last_scraped_at: string | null
  last_success_at: string | null
  last_error: string | null
  hours_since_last_success: number | null
  status: CheckStatus
}

export type DocumentStats = {
  total: number
  by_type: Record<string, number>
  by_source: Record<string, number>
  new_today: number
  new_7d: number
  unprocessed: number
  latest_doc_date: string | null
  latest_discovered_at: string | null
  pdfs_archived: number // docs avec metadata.storage_path
  pdfs_not_archived: number
}

export type MaintenanceReport = {
  generated_at: string
  overall_status: CheckStatus
  summary: {
    checks_passed: number
    checks_warning: number
    checks_critical: number
  }
  checks: Check[]
  sources: SourceHealth[]
  documents: DocumentStats
  recommendations: string[]
}

/* ── Helpers ──────────────────────────────────────────────────── */

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (isNaN(then)) return null
  return (Date.now() - then) / (1000 * 60 * 60)
}

function aggregateStatus(statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.every((s) => s === 'ok')) return 'ok'
  return 'unknown'
}

/* ── Checks unitaires ─────────────────────────────────────────── */

async function checkTablesPresent(db: SupabaseClient): Promise<Check[]> {
  const checks: Check[] = []

  for (const tableName of ['brvm_sources', 'brvm_documents']) {
    const { error } = await db.from(tableName).select('id', { count: 'exact', head: true })
    if (error) {
      const code = (error as { code?: string }).code ?? ''
      const msg = error.message
      if (code === '42P01' || code === 'PGRST205' || msg.includes('does not exist')) {
        checks.push({
          id: `table_${tableName}`,
          label: `Table ${tableName} existe`,
          status: 'critical',
          detail: `Table absente (${msg})`,
          hint: 'Applique la migration 023_brvm_clean_reset.sql dans Supabase Dashboard → SQL Editor',
        })
      } else {
        checks.push({
          id: `table_${tableName}`,
          label: `Table ${tableName} accessible`,
          status: 'warning',
          detail: `Erreur Supabase: ${msg}`,
        })
      }
    } else {
      checks.push({
        id: `table_${tableName}`,
        label: `Table ${tableName} accessible`,
        status: 'ok',
        detail: 'OK',
      })
    }
  }

  return checks
}

async function checkSourcesSeed(db: SupabaseClient): Promise<{
  checks: Check[]
  sources: SourceHealth[]
}> {
  const { data, error } = await db
    .from('brvm_sources')
    .select('slug, name, priority, last_scraped_at, last_success_at, last_error')
    .order('priority')

  if (error) {
    return {
      checks: [
        {
          id: 'sources_query',
          label: 'Lecture brvm_sources',
          status: 'critical',
          detail: error.message,
          hint: 'La table brvm_sources est inaccessible. Applique la migration 023.',
        },
      ],
      sources: [],
    }
  }

  const rows = (data ?? []) as Array<{
    slug: string
    name: string
    priority: number
    last_scraped_at: string | null
    last_success_at: string | null
    last_error: string | null
  }>

  const checks: Check[] = []
  const foundSlugs = new Set(rows.map((r) => r.slug))

  // Vérifier que les 3 slugs attendus sont bien seedés
  for (const expected of EXPECTED_SOURCE_SLUGS) {
    if (!foundSlugs.has(expected)) {
      checks.push({
        id: `source_seed_${expected}`,
        label: `Source ${expected} seedée`,
        status: 'critical',
        detail: `Source "${expected}" absente de brvm_sources`,
        hint: 'Applique la migration 023_brvm_clean_reset.sql pour ré-insérer les seeds',
      })
    } else {
      checks.push({
        id: `source_seed_${expected}`,
        label: `Source ${expected} seedée`,
        status: 'ok',
        detail: 'Présente',
      })
    }
  }

  // Calcul de l'état de santé de chaque source
  const sources: SourceHealth[] = rows.map((r) => {
    const hours = hoursSince(r.last_success_at)
    let status: CheckStatus = 'unknown'
    if (r.last_scraped_at === null) {
      status = 'warning' // jamais tenté
    } else if (hours === null) {
      status = 'critical' // aucun succès jamais
    } else if (hours < 48) {
      status = 'ok'
    } else if (hours < 168) {
      status = 'warning' // dernier succès < 7j
    } else {
      status = 'critical' // > 7j sans succès
    }

    return {
      slug: r.slug,
      name: r.name,
      priority: r.priority,
      last_scraped_at: r.last_scraped_at,
      last_success_at: r.last_success_at,
      last_error: r.last_error,
      hours_since_last_success: hours,
      status,
    }
  })

  // Checks par source
  for (const s of sources) {
    const label = `Source ${s.slug} fraîcheur`
    if (s.status === 'ok') {
      checks.push({
        id: `source_fresh_${s.slug}`,
        label,
        status: 'ok',
        detail: `Dernier succès il y a ${s.hours_since_last_success!.toFixed(1)}h`,
      })
    } else if (s.status === 'warning' && s.last_scraped_at === null) {
      checks.push({
        id: `source_fresh_${s.slug}`,
        label,
        status: 'warning',
        detail: 'Jamais scrapée',
        hint: `Lance POST /api/brvm/scrape ou va sur /admin/brvm → bouton "Lancer la veille"`,
      })
    } else if (s.status === 'warning') {
      checks.push({
        id: `source_fresh_${s.slug}`,
        label,
        status: 'warning',
        detail: `Dernier succès il y a ${s.hours_since_last_success?.toFixed(1) ?? '?'}h (> 48h)`,
        hint: 'Source silencieuse depuis plus de 2 jours. Vérifie la disponibilité.',
      })
    } else if (s.status === 'critical') {
      const lastErr = s.last_error ? ` Dernière erreur: ${s.last_error.slice(0, 100)}` : ''
      checks.push({
        id: `source_fresh_${s.slug}`,
        label,
        status: 'critical',
        detail:
          s.last_success_at === null
            ? `Aucun scraping réussi — ${s.last_scraped_at ? 'la dernière tentative a échoué.' : 'jamais tenté.'}${lastErr}`
            : `Dernier succès > 7 jours (${s.hours_since_last_success!.toFixed(0)}h)`,
        hint:
          'Vérifie les logs PM2 (pm2 logs hedjav-web | grep brvm), tester manuellement le scraper via /admin/brvm ou curl.',
      })
    }
  }

  return { checks, sources }
}

async function checkDocuments(db: SupabaseClient): Promise<{
  checks: Check[]
  stats: DocumentStats
}> {
  const checks: Check[] = []

  const [totalRes, byType, bySource, unprocessed, latestDoc, latestDiscovered, newToday, new7d] =
    await Promise.all([
      db.from('brvm_documents').select('*', { count: 'exact', head: true }),
      Promise.all(
        DOC_TYPES.map((t) =>
          db.from('brvm_documents').select('*', { count: 'exact', head: true }).eq('doc_type', t)
        )
      ),
      db.from('brvm_documents').select('brvm_sources!inner(slug), id'),
      db.from('brvm_documents').select('*', { count: 'exact', head: true }).eq('is_processed', false),
      db
        .from('brvm_documents')
        .select('doc_date')
        .not('doc_date', 'is', null)
        .order('doc_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('brvm_documents')
        .select('discovered_at')
        .order('discovered_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('brvm_documents')
        .select('*', { count: 'exact', head: true })
        .gte('discovered_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      db
        .from('brvm_documents')
        .select('*', { count: 'exact', head: true })
        .gte('discovered_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
    ])

  // Compte PDFs archivés vs non archivés (via metadata.storage_path)
  const { data: allDocs } = await db.from('brvm_documents').select('metadata')
  const pdfsArchived =
    allDocs?.filter((d: { metadata: Record<string, unknown> | null }) => {
      const sp = d.metadata?.storage_path
      return typeof sp === 'string' && sp.length > 0
    }).length ?? 0
  const pdfsNotArchived = (allDocs?.length ?? 0) - pdfsArchived

  const stats: DocumentStats = {
    total: totalRes.count ?? 0,
    by_type: Object.fromEntries(
      DOC_TYPES.map((t, i) => [t, byType[i].count ?? 0])
    ) as Record<string, number>,
    by_source: (() => {
      const acc: Record<string, number> = {}
      const rows = (bySource.data ?? []) as unknown as Array<{
        brvm_sources: { slug: string } | { slug: string }[] | null
      }>
      for (const r of rows) {
        // Supabase peut retourner l'objet joint en array ou singleton selon le schéma
        const joined = Array.isArray(r.brvm_sources) ? r.brvm_sources[0] : r.brvm_sources
        const s = joined?.slug ?? 'unknown'
        acc[s] = (acc[s] ?? 0) + 1
      }
      return acc
    })(),
    new_today: newToday.count ?? 0,
    new_7d: new7d.count ?? 0,
    unprocessed: unprocessed.count ?? 0,
    latest_doc_date: (latestDoc.data as { doc_date: string | null } | null)?.doc_date ?? null,
    latest_discovered_at:
      (latestDiscovered.data as { discovered_at: string } | null)?.discovered_at ?? null,
    pdfs_archived: pdfsArchived,
    pdfs_not_archived: pdfsNotArchived,
  }

  // Check 1 : base contient au moins quelques documents
  if (stats.total === 0) {
    checks.push({
      id: 'docs_total',
      label: 'Documents indexés',
      status: 'warning',
      detail: 'Aucun document dans brvm_documents',
      hint: 'Lance la veille via /admin/brvm (bouton "Lancer la veille") ou le cron /api/brvm/scrape',
    })
  } else {
    checks.push({
      id: 'docs_total',
      label: 'Documents indexés',
      status: 'ok',
      detail: `${stats.total} documents`,
    })
  }

  // Check 2 : BOC présents (priorité métier)
  const bocCount = stats.by_type['boc'] ?? 0
  if (bocCount === 0) {
    checks.push({
      id: 'docs_boc',
      label: 'BOC indexés (priorité métier)',
      status: 'warning',
      detail: 'Aucun BOC en base',
      hint: 'Lance POST /api/brvm/scrape/boc pour scraper les derniers BOC',
    })
  } else {
    checks.push({
      id: 'docs_boc',
      label: 'BOC indexés (priorité métier)',
      status: 'ok',
      detail: `${bocCount} BOC`,
    })
  }

  // Check 3 : fraîcheur — au moins 1 doc récent dans les 7 derniers jours
  if (stats.total > 0 && stats.new_7d === 0) {
    checks.push({
      id: 'docs_fresh',
      label: 'Fraîcheur des découvertes',
      status: 'warning',
      detail: 'Aucun document découvert dans les 7 derniers jours',
      hint: 'Vérifie que le cron /api/brvm/scrape tourne bien. Regarde /admin/brvm bandeau sources.',
    })
  } else if (stats.new_7d > 0) {
    checks.push({
      id: 'docs_fresh',
      label: 'Fraîcheur des découvertes',
      status: 'ok',
      detail: `${stats.new_7d} docs découverts dans les 7j`,
    })
  }

  // Check 4 : nouveautés en attente de traitement
  if (stats.unprocessed > 50) {
    checks.push({
      id: 'docs_unprocessed',
      label: 'Backlog nouveautés',
      status: 'warning',
      detail: `${stats.unprocessed} nouveautés non traitées`,
      hint: 'Va sur /admin/brvm onglet "Nouveautés" et marque les documents vus comme traités',
    })
  } else {
    checks.push({
      id: 'docs_unprocessed',
      label: 'Backlog nouveautés',
      status: 'ok',
      detail: `${stats.unprocessed} nouveautés en attente`,
    })
  }

  return { checks, stats }
}

/* ── Rapport global ────────────────────────────────────────────── */

export async function generateMaintenanceReport(): Promise<MaintenanceReport> {
  const db = adminClient()

  // 1. Tables présentes ?
  const tableChecks = await checkTablesPresent(db)
  const anyTableMissing = tableChecks.some((c) => c.status === 'critical')

  if (anyTableMissing) {
    // Stop court-circuité : pas la peine de vérifier le reste
    return {
      generated_at: new Date().toISOString(),
      overall_status: 'critical',
      summary: {
        checks_passed: tableChecks.filter((c) => c.status === 'ok').length,
        checks_warning: tableChecks.filter((c) => c.status === 'warning').length,
        checks_critical: tableChecks.filter((c) => c.status === 'critical').length,
      },
      checks: tableChecks,
      sources: [],
      documents: {
        total: 0,
        by_type: {},
        by_source: {},
        new_today: 0,
        new_7d: 0,
        unprocessed: 0,
        latest_doc_date: null,
        latest_discovered_at: null,
        pdfs_archived: 0,
        pdfs_not_archived: 0,
      },
      recommendations: [
        'Les tables BRVM sont absentes ou inaccessibles.',
        'Applique la migration 023_brvm_clean_reset.sql dans Supabase Dashboard → SQL Editor.',
        'Vérifie ensuite via cette commande : npx tsx scripts/brvm-health-check.ts',
      ],
    }
  }

  // 2. Sources seed + fraîcheur
  const { checks: sourceChecks, sources } = await checkSourcesSeed(db)

  // 3. Documents
  const { checks: docChecks, stats: documents } = await checkDocuments(db)

  // 4. Agrégation
  const checks = [...tableChecks, ...sourceChecks, ...docChecks]
  const overall = aggregateStatus(checks.map((c) => c.status))
  const summary = {
    checks_passed: checks.filter((c) => c.status === 'ok').length,
    checks_warning: checks.filter((c) => c.status === 'warning').length,
    checks_critical: checks.filter((c) => c.status === 'critical').length,
  }

  // 5. Recommandations (de-duplication des hints uniques)
  const recommendations: string[] = []
  const seenHints = new Set<string>()
  for (const c of checks) {
    if (c.hint && !seenHints.has(c.hint) && c.status !== 'ok') {
      recommendations.push(`[${c.label}] ${c.hint}`)
      seenHints.add(c.hint)
    }
  }
  // Recos additionnelles basées sur les stats
  if (documents.pdfs_archived === 0 && documents.total > 0) {
    recommendations.push(
      '[Archivage PDF] Aucun PDF n\'a été téléchargé en local. Utilise /admin/brvm → Downloader ou `scripts/download-brvm-pdfs.ts` pour archiver les fichiers.'
    )
  }

  return {
    generated_at: new Date().toISOString(),
    overall_status: overall,
    summary,
    checks,
    sources,
    documents,
    recommendations,
  }
}

/* ── Format texte (utilisé par le CLI) ─────────────────────────── */

const STATUS_ICON: Record<CheckStatus, string> = {
  ok: '✓',
  warning: '!',
  critical: '✗',
  unknown: '?',
}

export function formatReportText(report: MaintenanceReport): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════')
  lines.push(`  BRVM Maintenance Report — ${report.generated_at}`)
  lines.push(`  État global : ${report.overall_status.toUpperCase()}`)
  lines.push('═══════════════════════════════════════════════════════════')
  lines.push('')

  lines.push(`Checks : ✓ ${report.summary.checks_passed}  ! ${report.summary.checks_warning}  ✗ ${report.summary.checks_critical}`)
  lines.push('')

  lines.push('── Checks ──')
  for (const c of report.checks) {
    lines.push(`  ${STATUS_ICON[c.status]} [${c.status.padEnd(8)}] ${c.label}`)
    lines.push(`       ${c.detail}`)
    if (c.hint && c.status !== 'ok') lines.push(`       → ${c.hint}`)
  }
  lines.push('')

  if (report.sources.length > 0) {
    lines.push('── Sources ──')
    for (const s of report.sources) {
      const hours = s.hours_since_last_success
        ? `${s.hours_since_last_success.toFixed(1)}h`
        : 'jamais'
      lines.push(
        `  ${STATUS_ICON[s.status]} ${s.slug.padEnd(14)} prio=${s.priority} dernier succès: ${hours}`
      )
      if (s.last_error) lines.push(`       erreur: ${s.last_error.slice(0, 120)}`)
    }
    lines.push('')
  }

  lines.push('── Documents ──')
  lines.push(`  Total              : ${report.documents.total}`)
  lines.push(`  Découverts < 24h   : ${report.documents.new_today}`)
  lines.push(`  Découverts < 7j    : ${report.documents.new_7d}`)
  lines.push(`  Non traités        : ${report.documents.unprocessed}`)
  lines.push(`  Dernière date doc  : ${report.documents.latest_doc_date ?? '-'}`)
  lines.push(`  Dernière découverte: ${report.documents.latest_discovered_at?.slice(0, 19).replace('T', ' ') ?? '-'}`)
  lines.push(`  PDFs archivés      : ${report.documents.pdfs_archived} / ${report.documents.total}`)
  lines.push('')

  lines.push('  Par type :')
  for (const [type, count] of Object.entries(report.documents.by_type)) {
    if (count > 0) lines.push(`    ${type.padEnd(24)} ${count}`)
  }
  lines.push('')

  if (report.recommendations.length > 0) {
    lines.push('── Recommandations ──')
    for (const r of report.recommendations) {
      lines.push(`  → ${r}`)
    }
    lines.push('')
  }

  lines.push('═══════════════════════════════════════════════════════════')

  return lines.join('\n')
}
