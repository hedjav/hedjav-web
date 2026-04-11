/**
 * PDF downloader BRVM — téléchargement par période depuis les sources live.
 *
 * Règles métier (voir docs/BRVM_DOWNLOADER.md) :
 *  - Priorité : brvm.org > bfin > sikafinance
 *  - Stockage : bucket privé Supabase `brvm-documents` (jamais base64 en DB)
 *  - Dédup : par checksum binaire SHA256 du fichier + par storage_path
 *  - PDF = à la demande, jamais automatique
 *  - Journalisation fine : found / downloaded / skipped / missing / error
 *  - Résilient : continue même si une URL est morte ou une source temporairement down
 *
 * Le storage_path est stocké dans `brvm_documents.metadata.storage_path`
 * (évite une migration pour une V1).
 *
 * ── Tolérance aux `doc_date = NULL` ────────────────────────────────────────
 * Le filtre de période n'utilise plus `.gte/.lte('doc_date', ...)` côté SQL
 * (qui excluent les NULL), mais un post-filtre JS via `effectiveDate(doc)`
 * qui retombe sur `discovered_at.slice(0,10)` quand `doc_date` est NULL.
 * Les requêtes chargent au plus 500 lignes puis filtrent en mémoire.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computeFileChecksum } from './checksum'
import { brvmFetchOptions, extractFetchError } from './http'
import type { DocType, BrvmDocument } from './types'

const DOWNLOAD_TIMEOUT = 30_000 // 30s par PDF
const STORAGE_BUCKET = 'brvm-documents'
const HARD_SQL_LIMIT = 500

/* ── Types publics ─────────────────────────────────────────────── */

export type DownloadRequest = {
  date_from?: string // ISO YYYY-MM-DD
  date_to?: string // ISO YYYY-MM-DD
  doc_types?: DocType[]
  source_slugs?: string[] // filtre sur source — défaut: toutes
  force?: boolean // re-télécharge même si déjà archivé
  limit?: number // max de PDFs à traiter en 1 run (défaut 50)
}

export type DownloadItem = {
  document_id: string
  title: string
  doc_type: DocType
  doc_date: string | null
  source_name: string
  pdf_url: string
  status: 'downloaded' | 'skipped_already_archived' | 'skipped_no_pdf_url' | 'missing' | 'error'
  storage_path?: string
  file_size?: number
  file_checksum?: string
  error?: string
  duration_ms?: number
}

export type ReasonIfZero =
  | 'table_vide'
  | 'aucun_type_match'
  | 'hors_plage_de_dates'
  | 'filtre_source'
  | null

export type DownloaderDiagnostic = {
  db_total: number
  db_with_doc_date: number
  db_without_doc_date: number
  min_doc_date: string | null
  max_doc_date: string | null
  min_discovered_at: string | null
  max_discovered_at: string | null
  last_5_inserted: Array<{
    id: string
    title: string
    doc_type: string
    doc_date: string | null
    discovered_at: string
  }>
}

export type DownloadReport = {
  request: DownloadRequest
  started_at: string
  finished_at: string
  duration_ms: number
  total_matched: number
  total_processed: number
  counts: {
    downloaded: number
    skipped_already_archived: number
    skipped_no_pdf_url: number
    missing: number
    error: number
  }
  items: DownloadItem[]
  /**
   * Rempli uniquement quand `total_matched === 0` pour comprendre pourquoi.
   * Contient un snapshot DB + un `reason_if_zero` qui dit la cause en clair.
   */
  diagnostic?: DownloaderDiagnostic & { reason_if_zero: ReasonIfZero }
}

/* ── Helpers ──────────────────────────────────────────────────── */

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Date effective pour le filtrage de période : `doc_date` si présent,
 * sinon fallback sur le jour où le document a été découvert.
 * Garantit qu'un document sans date extraite reste éligible au downloader.
 */
function effectiveDate(doc: {
  doc_date: string | null
  discovered_at: string | null
}): string | null {
  if (doc.doc_date) return doc.doc_date
  if (doc.discovered_at) return doc.discovered_at.slice(0, 10)
  return null
}

/**
 * Vrai si le document tombe dans la période [from, to] selon `effectiveDate`.
 * Bornes ouvertes acceptées (undefined = pas de borne).
 */
function matchesPeriod(
  doc: { doc_date: string | null; discovered_at: string | null },
  from?: string,
  to?: string
): boolean {
  const eff = effectiveDate(doc)
  if (!eff) return false
  if (from && eff < from) return false
  if (to && eff > to) return false
  return true
}

/**
 * Construit un chemin Storage canonique à partir des métadonnées du document.
 * Pattern : `{doc_type}/{YYYY}/{YYYY-MM-DD}_{checksum8}.pdf`
 * Si pas de date, utilise discovered_at ou 'unknown'.
 */
function buildStoragePath(doc: {
  doc_type: string
  doc_date: string | null
  discovered_at: string
  checksum: string
}): string {
  const date = doc.doc_date ?? doc.discovered_at.slice(0, 10) ?? 'unknown'
  const year = date.slice(0, 4) || 'unknown'
  const shortHash = doc.checksum.slice(0, 8)
  return `${doc.doc_type}/${year}/${date}_${shortHash}.pdf`
}

/**
 * Télécharge un PDF avec timeout et gestion propre des erreurs.
 * Retourne le buffer ou null si 404/timeout/réseau.
 */
async function fetchPdfBuffer(url: string): Promise<
  { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; reason: 'not_found' | 'timeout' | 'network' | 'not_pdf'; error: string }
> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT)

    // Utilise brvmFetchOptions pour appliquer l'Agent SSL-relâché quand
    // l'URL pointe sur brvm.org (cert chain incomplet Drupal 7). Ce fetch
    // servait les 404 "fetch failed" sur tous les BOCs avant PR #66.
    const res = await fetch(
      url,
      brvmFetchOptions(url, {
        signal: ctrl.signal,
        headers: { Accept: 'application/pdf,*/*' },
      })
    )
    clearTimeout(timer)

    if (res.status === 404) return { ok: false, reason: 'not_found', error: `HTTP 404 ${url}` }
    if (!res.ok) {
      return { ok: false, reason: 'network', error: `HTTP ${res.status} ${url}` }
    }

    const contentType = res.headers.get('content-type') ?? ''
    // Accepte application/pdf OU application/octet-stream (certains CDNs renvoient octet-stream)
    if (
      !contentType.includes('pdf') &&
      !contentType.includes('octet-stream') &&
      !contentType.includes('binary')
    ) {
      return { ok: false, reason: 'not_pdf', error: `content-type inattendu: ${contentType}` }
    }

    const ab = await res.arrayBuffer()
    if (ab.byteLength < 500) {
      // Un "vrai" PDF fait toujours > 500 bytes. Si c'est plus petit, c'est une page d'erreur HTML.
      return { ok: false, reason: 'not_pdf', error: `fichier trop petit (${ab.byteLength} bytes)` }
    }

    return { ok: true, buffer: Buffer.from(ab), contentType: 'application/pdf' }
  } catch (e) {
    const msg = extractFetchError(e)
    if (msg.includes('abort') || msg.includes('timeout') || msg.includes('Timeout')) {
      return { ok: false, reason: 'timeout', error: msg }
    }
    return { ok: false, reason: 'network', error: msg }
  }
}

/* ── API principale ────────────────────────────────────────────── */

type DocumentWithSource = BrvmDocument & {
  source_slug: string
  source_name: string
}

/**
 * Liste les documents qui correspondent à la requête de téléchargement.
 *
 * Stratégie :
 *  1. On ne filtre PAS `doc_date` côté SQL (évite d'exclure les NULL
 *     silencieusement via `.gte/.lte`)
 *  2. On applique les filtres non-date côté SQL : `doc_type`, `source_slug`
 *  3. On charge jusqu'à 500 lignes triées par `discovered_at DESC`
 *  4. On post-filtre en JS via `matchesPeriod` qui utilise `effectiveDate`
 *     (fallback `discovered_at` quand `doc_date = NULL`)
 *  5. On coupe à `request.limit` utilisateur (défaut 50)
 */
export async function listDocumentsForDownload(
  request: DownloadRequest
): Promise<DocumentWithSource[]> {
  const db = adminClient()
  let query = db
    .from('brvm_documents')
    .select('*, brvm_sources!inner(slug, name)')
    .order('discovered_at', { ascending: false })

  if (request.doc_types && request.doc_types.length > 0) {
    query = query.in('doc_type', request.doc_types)
  }
  if (request.source_slugs && request.source_slugs.length > 0) {
    query = query.in('brvm_sources.slug', request.source_slugs)
  }

  // Hard cap SQL pour borner le coût mémoire
  query = query.limit(HARD_SQL_LIMIT)

  const { data, error } = await query
  if (error) {
    console.error('[pdf-downloader] listDocumentsForDownload:', error.message)
    throw new Error(`Erreur Supabase: ${error.message}`)
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const src = r.brvm_sources as { slug: string; name: string } | null
    return {
      ...(r as unknown as BrvmDocument),
      source_slug: src?.slug ?? '',
      source_name: src?.name ?? '',
    } as DocumentWithSource
  })

  // Post-filtrage JS par période avec fallback discovered_at
  const filtered = rows.filter((d) => matchesPeriod(d, request.date_from, request.date_to))

  const userLimit = Math.min(request.limit ?? 50, HARD_SQL_LIMIT)
  return filtered.slice(0, userLimit)
}

/**
 * Snapshot complet de `brvm_documents` pour diagnostic UI et API.
 * Chaque query est wrappée en try/catch indépendant : si l'une plante,
 * les autres aboutissent quand même. Latence cible ~150ms via `Promise.all`.
 */
export async function getDownloaderDiagnostic(): Promise<DownloaderDiagnostic> {
  const db = adminClient()

  // Helpers async pour pouvoir utiliser try/catch autour des PromiseLike Supabase
  async function countTotal(): Promise<number> {
    try {
      const r = await db.from('brvm_documents').select('*', { count: 'exact', head: true })
      return r.count ?? 0
    } catch {
      return 0
    }
  }

  async function countWithDate(): Promise<number> {
    try {
      const r = await db
        .from('brvm_documents')
        .select('*', { count: 'exact', head: true })
        .not('doc_date', 'is', null)
      return r.count ?? 0
    } catch {
      return 0
    }
  }

  async function fetchMinDocDate(): Promise<string | null> {
    try {
      const r = await db
        .from('brvm_documents')
        .select('doc_date')
        .not('doc_date', 'is', null)
        .order('doc_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      return (r.data?.doc_date as string | null) ?? null
    } catch {
      return null
    }
  }

  async function fetchMaxDocDate(): Promise<string | null> {
    try {
      const r = await db
        .from('brvm_documents')
        .select('doc_date')
        .not('doc_date', 'is', null)
        .order('doc_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (r.data?.doc_date as string | null) ?? null
    } catch {
      return null
    }
  }

  async function fetchMinDiscoveredAt(): Promise<string | null> {
    try {
      const r = await db
        .from('brvm_documents')
        .select('discovered_at')
        .order('discovered_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      return (r.data?.discovered_at as string | null) ?? null
    } catch {
      return null
    }
  }

  async function fetchLast5(): Promise<DownloaderDiagnostic['last_5_inserted']> {
    try {
      const r = await db
        .from('brvm_documents')
        .select('id, title, doc_type, doc_date, discovered_at')
        .order('discovered_at', { ascending: false })
        .limit(5)
      return (r.data ?? []) as DownloaderDiagnostic['last_5_inserted']
    } catch {
      return []
    }
  }

  const [total, withDate, minDate, maxDate, minDiscovered, last5] = await Promise.all([
    countTotal(),
    countWithDate(),
    fetchMinDocDate(),
    fetchMaxDocDate(),
    fetchMinDiscoveredAt(),
    fetchLast5(),
  ])

  // max_discovered_at = première ligne de last_5_inserted (trié DESC)
  const maxDiscovered = last5.length > 0 ? last5[0].discovered_at : null

  return {
    db_total: total,
    db_with_doc_date: withDate,
    db_without_doc_date: Math.max(0, total - withDate),
    min_doc_date: minDate,
    max_doc_date: maxDate,
    min_discovered_at: minDiscovered,
    max_discovered_at: maxDiscovered,
    last_5_inserted: last5,
  }
}

/**
 * Calcule la raison la plus probable pour un `total_matched = 0`.
 * Priorité : table vide > hors plage > filtre types/sources.
 */
function computeReasonIfZero(
  request: DownloadRequest,
  diag: DownloaderDiagnostic
): ReasonIfZero {
  if (diag.db_total === 0) return 'table_vide'

  const from = request.date_from
  const to = request.date_to

  // Si la plage demandée est hors de la plage des docs en base, on le détecte
  if (from && diag.max_doc_date && diag.max_doc_date < from) return 'hors_plage_de_dates'
  if (to && diag.min_doc_date && diag.min_doc_date > to) return 'hors_plage_de_dates'

  // Si on n'a pas pu prouver qu'on est hors plage, c'est probablement un filtre
  // types/sources qui exclut tout, ou une plage qui coupe au milieu
  return 'aucun_type_match'
}

/**
 * Vérifie si un document est déjà archivé en Storage (via metadata.storage_path).
 */
function isAlreadyArchived(doc: BrvmDocument): string | null {
  const metaPath = (doc.metadata as Record<string, unknown> | null)?.storage_path
  return typeof metaPath === 'string' ? metaPath : null
}

/**
 * Télécharge un seul PDF et l'archive dans Supabase Storage.
 * Mets à jour `brvm_documents.metadata.storage_path` et `metadata.file_size/file_checksum/downloaded_at`.
 */
async function downloadOne(
  doc: DocumentWithSource,
  options: { force: boolean }
): Promise<DownloadItem> {
  const start = Date.now()
  const base: Omit<DownloadItem, 'status'> = {
    document_id: doc.id,
    title: doc.title,
    doc_type: doc.doc_type,
    doc_date: doc.doc_date,
    source_name: doc.source_name,
    pdf_url: doc.pdf_url ?? '',
  }

  // 1. Pas de pdf_url → skip
  if (!doc.pdf_url) {
    return { ...base, status: 'skipped_no_pdf_url', duration_ms: Date.now() - start }
  }

  // 2. Déjà archivé et pas en mode force → skip
  const existingPath = isAlreadyArchived(doc)
  if (existingPath && !options.force) {
    return {
      ...base,
      status: 'skipped_already_archived',
      storage_path: existingPath,
      duration_ms: Date.now() - start,
    }
  }

  // 3. Téléchargement
  const fetched = await fetchPdfBuffer(doc.pdf_url)
  if (!fetched.ok) {
    const status: DownloadItem['status'] = fetched.reason === 'not_found' ? 'missing' : 'error'
    return { ...base, status, error: fetched.error, duration_ms: Date.now() - start }
  }

  // 4. Calcul checksum binaire (différent du checksum composite de brvm_documents)
  const fileChecksum = computeFileChecksum(fetched.buffer)
  const storagePath = buildStoragePath({
    doc_type: doc.doc_type,
    doc_date: doc.doc_date,
    discovered_at: doc.discovered_at,
    checksum: doc.checksum,
  })

  // 5. Upload Storage (upsert: true permet de remplacer en mode force)
  const db = adminClient()
  const { error: uploadErr } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fetched.buffer, {
      contentType: fetched.contentType,
      upsert: options.force,
    })

  if (uploadErr) {
    // Si le fichier existe déjà (et qu'on n'est pas en force), c'est en fait un skip silencieux
    if (uploadErr.message.includes('already exists') && !options.force) {
      // Mets quand même à jour la metadata pour cohérence
      await db
        .from('brvm_documents')
        .update({
          metadata: {
            ...(doc.metadata as Record<string, unknown>),
            storage_path: storagePath,
            file_checksum: fileChecksum,
            file_size: fetched.buffer.byteLength,
            downloaded_at: new Date().toISOString(),
          },
        })
        .eq('id', doc.id)

      return {
        ...base,
        status: 'skipped_already_archived',
        storage_path: storagePath,
        file_size: fetched.buffer.byteLength,
        file_checksum: fileChecksum,
        duration_ms: Date.now() - start,
      }
    }

    return { ...base, status: 'error', error: uploadErr.message, duration_ms: Date.now() - start }
  }

  // 6. Mise à jour metadata du document
  const { error: updateErr } = await db
    .from('brvm_documents')
    .update({
      metadata: {
        ...(doc.metadata as Record<string, unknown>),
        storage_path: storagePath,
        file_checksum: fileChecksum,
        file_size: fetched.buffer.byteLength,
        downloaded_at: new Date().toISOString(),
      },
    })
    .eq('id', doc.id)

  if (updateErr) {
    // Le fichier est uploadé mais la metadata n'a pas été mise à jour
    console.warn(`[pdf-downloader] upload OK mais metadata update failed pour ${doc.id}: ${updateErr.message}`)
  }

  return {
    ...base,
    status: 'downloaded',
    storage_path: storagePath,
    file_size: fetched.buffer.byteLength,
    file_checksum: fileChecksum,
    duration_ms: Date.now() - start,
  }
}

/**
 * Point d'entrée principal — télécharge tous les PDFs matchés par la requête.
 * Appelle downloadOne() pour chaque document en séquence (pas en parallèle pour
 * éviter de surcharger brvm.org).
 *
 * Quand `items.length === 0`, enrichit le rapport avec un `diagnostic` qui
 * explique pourquoi en clair (table vide, hors plage, filtre trop strict).
 */
export async function downloadByPeriod(request: DownloadRequest): Promise<DownloadReport> {
  const startedAt = new Date()
  const start = Date.now()

  const documents = await listDocumentsForDownload(request)
  const items: DownloadItem[] = []

  for (const doc of documents) {
    const item = await downloadOne(doc, { force: request.force ?? false })
    items.push(item)
    // Petit délai entre téléchargements pour être poli
    if (item.status === 'downloaded') {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  const counts = {
    downloaded: items.filter((i) => i.status === 'downloaded').length,
    skipped_already_archived: items.filter((i) => i.status === 'skipped_already_archived').length,
    skipped_no_pdf_url: items.filter((i) => i.status === 'skipped_no_pdf_url').length,
    missing: items.filter((i) => i.status === 'missing').length,
    error: items.filter((i) => i.status === 'error').length,
  }

  // Diagnostic si 0 matché : snapshot DB + raison la plus probable
  let diagnostic: DownloadReport['diagnostic']
  if (items.length === 0) {
    const diag = await getDownloaderDiagnostic().catch(() => null)
    if (diag) {
      diagnostic = { ...diag, reason_if_zero: computeReasonIfZero(request, diag) }
    }
  }

  const finishedAt = new Date()
  return {
    request,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: Date.now() - start,
    total_matched: documents.length,
    total_processed: items.length,
    counts,
    items,
    diagnostic,
  }
}

/**
 * Génère une signed URL pour télécharger un PDF archivé (utilisé par l'admin
 * pour télécharger depuis le browser sans exposer le service-role).
 */
export async function getSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const db = adminClient()
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds, { download: true })

  if (error || !data?.signedUrl) {
    console.error('[pdf-downloader] getSignedDownloadUrl:', error?.message)
    return null
  }
  return data.signedUrl
}
