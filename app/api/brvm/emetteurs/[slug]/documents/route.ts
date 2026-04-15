/**
 * GET /api/brvm/emetteurs/[slug]/documents
 *
 * Liste paginée des documents d'une société, filtrable par type.
 * Session admin. Tri DESC toujours.
 */

import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { getEmetteurBySlug } from '@/lib/brvm/emetteurs'
import { listDocuments } from '@/lib/brvm/documents'
import type { DocFamily } from '@/lib/brvm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const { slug } = await params
  const emetteur = await getEmetteurBySlug(slug)
  if (!emetteur) {
    return NextResponse.json({ error: 'Émetteur introuvable' }, { status: 404 })
  }

  const url = new URL(request.url)
  const family = url.searchParams.get('family') as DocFamily | null
  const subtype = url.searchParams.get('subtype')
  const search = url.searchParams.get('search') ?? undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0

  const result = await listDocuments({
    emetteur_id: emetteur.id,
    doc_family: family ?? undefined,
    doc_subtype: subtype ?? undefined,
    search,
    limit,
    offset,
    sort: 'doc_date_desc',
  })

  return NextResponse.json({ emetteur: { slug: emetteur.slug, name: emetteur.name }, ...result })
}
