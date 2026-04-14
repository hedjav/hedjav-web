import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { listDocuments, type DocumentListFilters, type SortField } from '@/lib/brvm/documents'
import { parsePeriodPreset } from '@/lib/brvm/periods'
import { DOC_TYPES, type DocType } from '@/lib/brvm/types'

/**
 * GET /api/brvm/documents
 *
 * Liste paginée des documents BRVM pour le hub admin de veille.
 *
 * Query params (tous optionnels) :
 *   - period            today | 7d | 30d | this_month | custom | all (défaut 7d)
 *   - period_from/_to   yyyy-mm-dd si period=custom
 *   - doc_type          filtre mono-type (legacy)
 *   - doc_types         CSV multi-types (ex: "boc,rapport_annuel,communique")
 *   - source_slug       brvm-org | bfin | sikafinance
 *   - is_new            true | false
 *   - is_processed      true | false
 *   - issuer_slug       identifiant société cotée
 *   - sector            secteur (stocké dans metadata->>sector)
 *   - market_index      BRVM Composite / BRVM 30 / BRVM Prestige (metadata->>market_index)
 *   - date_from/_to     filtre exact sur doc_date (avancé, bypass period)
 *   - search            texte libre sur title + description + issuer_name
 *   - sort              discovered_desc (défaut) | doc_date_desc | type_then_date
 *   - limit             défaut 50, max 200
 *   - offset            défaut 0
 */
export async function GET(request: Request) {
  const { response } = await checkAdminSession()
  if (response) return response

  const url = new URL(request.url)
  const q = url.searchParams

  const filters: DocumentListFilters = {
    limit: Math.min(Number(q.get('limit') ?? 50), 200),
    offset: Math.max(Number(q.get('offset') ?? 0), 0),
    period: parsePeriodPreset(q.get('period')),
    period_from: q.get('period_from'),
    period_to: q.get('period_to'),
  }

  const sort = q.get('sort')
  if (sort === 'discovered_desc' || sort === 'doc_date_desc' || sort === 'type_then_date') {
    filters.sort = sort as SortField
  }

  const docType = q.get('doc_type')
  if (docType && (DOC_TYPES as readonly string[]).includes(docType)) {
    filters.doc_type = docType as DocType
  }

  const docTypesCsv = q.get('doc_types')
  if (docTypesCsv) {
    const parts = docTypesCsv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => (DOC_TYPES as readonly string[]).includes(s)) as DocType[]
    if (parts.length > 0) filters.doc_types = parts
  }

  const sourceSlug = q.get('source_slug')
  if (sourceSlug) filters.source_slug = sourceSlug

  const isNew = q.get('is_new')
  if (isNew === 'true') filters.is_new = true
  else if (isNew === 'false') filters.is_new = false

  const isProcessed = q.get('is_processed')
  if (isProcessed === 'true') filters.is_processed = true
  else if (isProcessed === 'false') filters.is_processed = false

  const issuerSlug = q.get('issuer_slug')
  if (issuerSlug) filters.issuer_slug = issuerSlug

  const sector = q.get('sector')
  if (sector) filters.sector = sector

  const marketIndex = q.get('market_index')
  if (marketIndex) filters.market_index = marketIndex

  const dateFrom = q.get('date_from')
  if (dateFrom) filters.date_from = dateFrom
  const dateTo = q.get('date_to')
  if (dateTo) filters.date_to = dateTo

  const search = q.get('search')
  if (search) filters.search = search

  const { rows, total, period } = await listDocuments(filters)

  return NextResponse.json({
    ok: true,
    total,
    rows,
    period,
    sort: filters.sort ?? 'discovered_desc',
    limit: filters.limit,
    offset: filters.offset,
  })
}
