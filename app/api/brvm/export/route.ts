import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/brvm/export
 *
 * Exporte les documents BRVM (PDFs) pour une période et des types donnés.
 * Retourne la liste des fichiers disponibles avec leurs URLs de téléchargement.
 *
 * Body : { startDate, endDate, dataTypes?: string[] }
 *
 * Protégé : session admin (cookie) OU bearer INTERNAL_API_TOKEN.
 */
export async function POST(request: Request) {
  // Auth
  const auth = request.headers.get('authorization') ?? ''
  const isBearerAuth = process.env.INTERNAL_API_TOKEN && auth === `Bearer ${process.env.INTERNAL_API_TOKEN}`

  if (!isBearerAuth) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()
    const { startDate, endDate, dataTypes } = body as {
      startDate: string
      endDate: string
      dataTypes?: string[]
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate et endDate requis' }, { status: 400 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // Query brvm_data pour la période
    let query = db
      .from('brvm_data')
      .select('id, data_date, data_type, title, file_url, source_url, ai_summary, content')
      .gte('data_date', startDate)
      .lte('data_date', endDate)
      .order('data_date', { ascending: false })

    if (dataTypes && dataTypes.length > 0) {
      query = query.in('data_type', dataTypes)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: 'Aucune donnée pour cette période' }, { status: 404 })
    }

    // Organiser par type
    const TYPE_LABELS: Record<string, string> = {
      boc_quotidien: 'Bulletins Officiels de la Cote',
      resume_seance: 'Résumés de séance',
      cours_actions: 'Cours des actions',
      indices: 'Indices',
      rapport_societe: 'Rapports sociétés cotées',
      bulletin_mensuel: 'Bulletins mensuels',
      annonce_ag: 'Annonces — Assemblées Générales',
      annonce_communique: 'Annonces — Communiqués',
      annonce_esv: 'Annonces — Événements sur valeurs',
      annonce_notation: 'Annonces — Notations financières',
      annonce_resolution: 'Annonces — Projets de résolution',
      annonce_dirigeant: 'Annonces — Changements de dirigeants',
      annonce_seuil: 'Annonces — Franchissements de seuil',
      annonce_info_permanente: 'Annonces — Informations permanentes',
      avis_publication: 'Avis et publications',
      stats_trimestrielles: 'Statistiques trimestrielles',
      donnees_economiques: 'Données économiques',
    }

    const grouped: Record<string, {
      label: string
      documents: {
        date: string
        title: string
        fileUrl: string | null
        sourceUrl: string | null
        hasPdf: boolean
        summary: string | null
      }[]
    }> = {}

    for (const row of data) {
      const type = row.data_type as string
      if (!grouped[type]) {
        grouped[type] = {
          label: TYPE_LABELS[type] ?? type.replace(/_/g, ' '),
          documents: [],
        }
      }
      grouped[type].documents.push({
        date: row.data_date as string,
        title: (row.title as string) ?? type,
        fileUrl: (row.file_url as string) ?? null,
        sourceUrl: (row.source_url as string) ?? null,
        hasPdf: !!(row.file_url),
        summary: (row.ai_summary as string) ?? null,
      })
    }

    // Statistiques
    const totalDocs = data.length
    const totalPdfs = data.filter((d) => d.file_url).length
    const totalResumes = data.filter((d) => d.ai_summary).length

    return NextResponse.json({
      ok: true,
      period: { startDate, endDate },
      stats: {
        totalDocuments: totalDocs,
        totalPdfs,
        totalResumes,
        types: Object.keys(grouped).length,
      },
      categories: grouped,
    })
  } catch (e) {
    console.error('[brvm-export] Erreur:', e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Erreur interne' }, { status: 500 })
  }
}
