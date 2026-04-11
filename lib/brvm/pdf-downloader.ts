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
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computeFileChecksum } from './checksum'
import type { DocType, BrvmDocument } from './types'

const DOWNLOAD_TIMEOUT = 30_000 // 30s par PDF
const USER_AGENT = 'Hedjav-BRVM-Downloader/1.0 (+contact: hedjav@gmail.com)'
const STORAGE_BUCKET = 'brvm-documents'

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
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,*/*' },
      redirect: 'follow',
    })
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
    const msg = e instanceof Error ? e.message : 'erreur inconnue'
    if (msg.includes('abort') || msg.includes('timeout')) {
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
 * Ne lance pas les téléchargements — juste la requête DB.
 */
export async function listDocumentsForDownload(
  request: DownloadRequest
): Promise<DocumentWithSource[]> {
  const db = adminClient()
  let query = db
    .from('brvm_documents')
    .select('*, brvm_sources!inner(slug, name)')
    .order('doc_date', { ascending: false, nullsFirst: false })

  if (request.date_from) query = query.gte('doc_date', request.date_from)
  if (request.date_to) query = query.lte('doc_date', request.date_to)
  if (request.doc_types && request.doc_types.length > 0) {
    query = query.in('doc_type', request.doc_types)
  }
  if (request.source_slugs && request.source_slugs.length > 0) {
    query = query.in('brvm_sources.slug', request.source_slugs)
  }

  const limit = Math.min(request.limit ?? 50, 500)
  query = query.limit(limit)

  const { data, error } = await query
  if (error) {
    console.error('[pdf-downloader] listDocumentsForDownload:', error.message)
    throw new Error(`Erreur Supabase: ${error.message}`)
  }

  return (data ?? []).map((r: Record<string, unknown>) => {
    const src = r.brvm_sources as { slug: string; name: string } | null
    return {
      ...(r as unknown as BrvmDocument),
      source_slug: src?.slug ?? '',
      source_name: src?.name ?? '',
    }
  })
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
