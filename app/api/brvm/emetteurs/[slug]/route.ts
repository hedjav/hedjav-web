/**
 * GET /api/brvm/emetteurs/[slug]
 *
 * Détail d'un émetteur + KPIs (nb docs par type, dernier doc, dernier tick).
 * Session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession } from '@/lib/brvm/auth'
import { getEmetteurBySlug } from '@/lib/brvm/emetteurs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const adminCheck = await checkAdminSession()
  if (adminCheck.response) return adminCheck.response

  const { slug } = await params
  const emetteur = await getEmetteurBySlug(slug)
  if (!emetteur) {
    return NextResponse.json({ error: 'Émetteur introuvable' }, { status: 404 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // KPI : nb docs par doc_subtype
  const { data: groups } = await db
    .from('brvm_documents')
    .select('doc_subtype, doc_family')
    .eq('emetteur_id', emetteur.id)
    .limit(5000)

  const countsBySubtype: Record<string, number> = {}
  const countsByFamily: Record<string, number> = {}
  for (const g of groups ?? []) {
    if (g.doc_subtype) countsBySubtype[g.doc_subtype] = (countsBySubtype[g.doc_subtype] ?? 0) + 1
    if (g.doc_family) countsByFamily[g.doc_family] = (countsByFamily[g.doc_family] ?? 0) + 1
  }

  // Dernier doc
  const { data: latestDocs } = await db
    .from('brvm_documents')
    .select('id, title, doc_subtype, doc_family, doc_date, pdf_url, source_url')
    .eq('emetteur_id', emetteur.id)
    .order('doc_date', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .limit(5)

  // Dernier tick action
  const { data: latestTick } = await db
    .from('brvm_market_ticks')
    .select('*')
    .eq('emetteur_id', emetteur.id)
    .order('tick_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    emetteur,
    kpi: {
      total_docs: (groups ?? []).length,
      by_subtype: countsBySubtype,
      by_family: countsByFamily,
    },
    latest_docs: latestDocs ?? [],
    latest_tick: latestTick ?? null,
  })
}
