import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

/**
 * POST /api/brvm/export
 *
 * Exporte les donnees BRVM en fichier Excel.
 * Protege : session admin (cookie) OU bearer INTERNAL_API_TOKEN.
 *
 * Body : { startDate, endDate, dataTypes: string[], format: 'excel' }
 */
export async function POST(request: Request) {
  // Auth : bearer token OU cookie admin
  const auth = request.headers.get('authorization') ?? ''
  const expectedBearer = `Bearer ${process.env.INTERNAL_API_TOKEN ?? ''}`
  const isBearerAuth = process.env.INTERNAL_API_TOKEN && auth === expectedBearer

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  if (!isBearerAuth) {
    // Check admin session via cookie
    const { createServerClient } = await import('@supabase/ssr')
    const cookieHeader = request.headers.get('cookie') ?? ''
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=')
        return [k, v.join('=')]
      }),
    )

    const supaUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () =>
            Object.entries(cookies).map(([name, value]) => ({ name, value })),
          setAll: () => {},
        },
      },
    )

    const { data: { user } } = await supaUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    const { startDate, endDate, dataTypes, format } = body as {
      startDate: string
      endDate: string
      dataTypes: string[]
      format: string
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate et endDate requis' }, { status: 400 })
    }

    if (format !== 'excel') {
      return NextResponse.json({ error: 'Format non supporte (utiliser "excel")' }, { status: 400 })
    }

    // Query brvm_data
    let query = db
      .from('brvm_data')
      .select('*')
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
      return NextResponse.json({ ok: false, error: 'Aucune donnee pour cette periode' }, { status: 404 })
    }

    // Generer le classeur Excel
    const wb = XLSX.utils.book_new()

    // Regrouper par type
    const grouped = new Map<string, typeof data>()
    for (const row of data) {
      const type = row.data_type as string
      if (!grouped.has(type)) grouped.set(type, [])
      grouped.get(type)!.push(row)
    }

    for (const [type, rows] of grouped) {
      const sheetName = typeToSheetName(type)

      if (type === 'cours_actions') {
        // Extraire les cours actions du raw_data
        const allActions: Record<string, unknown>[] = []
        for (const row of rows) {
          const raw = row.raw_data as { actions?: Record<string, unknown>[] }
          if (raw?.actions) {
            for (const action of raw.actions) {
              allActions.push({
                Date: row.data_date,
                ...action,
              })
            }
          }
        }
        if (allActions.length > 0) {
          const ws = XLSX.utils.json_to_sheet(allActions)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        } else {
          appendGenericSheet(wb, sheetName, rows)
        }
      } else if (type === 'indices') {
        const allIndices: Record<string, unknown>[] = []
        for (const row of rows) {
          const raw = row.raw_data as { indices?: Record<string, unknown>[] }
          if (raw?.indices) {
            for (const idx of raw.indices) {
              allIndices.push({
                Date: row.data_date,
                ...idx,
              })
            }
          }
        }
        if (allIndices.length > 0) {
          const ws = XLSX.utils.json_to_sheet(allIndices)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        } else {
          appendGenericSheet(wb, sheetName, rows)
        }
      } else {
        appendGenericSheet(wb, sheetName, rows)
      }
    }

    // Feuille recapitulative
    const summary = Array.from(grouped.entries()).map(([type, rows]) => ({
      'Type': type,
      'Nombre': rows.length,
      'Premiere date': rows[rows.length - 1]?.data_date ?? '',
      'Derniere date': rows[0]?.data_date ?? '',
    }))
    const summaryWs = XLSX.utils.json_to_sheet(summary)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Recapitulatif')

    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const uint8 = new Uint8Array(xlsxBuffer)
    const fileName = `BRVM_${startDate}_${endDate}.xlsx`

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (e) {
    console.error('[brvm-export] Erreur:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

function typeToSheetName(type: string): string {
  const map: Record<string, string> = {
    resume_seance: 'Resume seance',
    cours_actions: 'Cours actions',
    indices: 'Indices',
    boc_quotidien: 'BOC',
    annonce: 'Annonces',
  }
  return (map[type] ?? type).slice(0, 31) // Excel max 31 chars
}

function appendGenericSheet(
  wb: XLSX.WorkBook,
  name: string,
  rows: Record<string, unknown>[],
) {
  const cleaned = rows.map((r) => ({
    Date: r.data_date,
    Type: r.data_type,
    Titre: r.title ?? '',
    Contenu: typeof r.content === 'string' ? r.content.slice(0, 500) : '',
    'Resume IA': typeof r.ai_summary === 'string' ? r.ai_summary.slice(0, 500) : '',
    URL_source: r.source_url ?? '',
    URL_fichier: r.file_url ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(cleaned)
  XLSX.utils.book_append_sheet(wb, ws, name)
}
