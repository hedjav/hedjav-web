import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { listDocuments, type DocumentListFilters } from '@/lib/brvm/documents'
import { DOC_TYPES, type DocType } from '@/lib/brvm/types'

/**
 * GET /api/brvm/documents
 *
 * Liste paginée des documents BRVM pour l'admin.
 * Query params :
 *   - doc_type (DocType)
 *   - source_slug ('brvm-org' | 'bfin' | 'sikafinance')
 *   - is_new ('true' | 'false')
 *   - is_processed ('true' | 'false')
 *   - date_from / date_to (YYYY-MM-DD)
 *   - search (texte libre sur title + description)
 *   - limit (défaut 50, max 200)
 *   - offset (défaut 0)
 */
export async function GET(request: Request) {
  const { response } = await checkAdminSession()
  if (response) return response

  const url = new URL(request.url)
  const q = url.searchParams

  const filters: DocumentListFilters = {
    limit: Math.min(Number(q.get('limit') ?? 50), 200),
    offset: Math.max(Number(q.get('offset') ?? 0), 0),
  }

  const docType = q.get('doc_type')
  if (docType && (DOC_TYPES as readonly string[]).includes(docType)) {
    filters.doc_type = docType as DocType
  }

  const sourceSlug = q.get('source_slug')
  if (sourceSlug) filters.source_slug = sourceSlug

  const isNew = q.get('is_new')
  if (isNew === 'true') filters.is_new = true
  else if (isNew === 'false') filters.is_new = false

  const isProcessed = q.get('is_processed')
  if (isProcessed === 'true') filters.is_processed = true
  else if (isProcessed === 'false') filters.is_processed = false

  const dateFrom = q.get('date_from')
  if (dateFrom) filters.date_from = dateFrom
  const dateTo = q.get('date_to')
  if (dateTo) filters.date_to = dateTo

  const search = q.get('search')
  if (search) filters.search = search

  const { rows, total } = await listDocuments(filters)

  return NextResponse.json({
    ok: true,
    total,
    rows,
    limit: filters.limit,
    offset: filters.offset,
  })
}
