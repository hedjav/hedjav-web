import { NextResponse } from 'next/server'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { downloadByPeriod, type DownloadRequest } from '@/lib/brvm/pdf-downloader'
import { DOC_TYPES, type DocType } from '@/lib/brvm/types'

/**
 * POST /api/brvm/download
 *
 * Télécharge les PDFs BRVM correspondant à une période et stocke dans le bucket
 * privé `brvm-documents`. Met à jour `brvm_documents.metadata.storage_path`.
 *
 * Auth : session admin OU Bearer INTERNAL_API_TOKEN (pour les crons éventuels).
 *
 * Body JSON :
 *   {
 *     date_from?: "YYYY-MM-DD",
 *     date_to?: "YYYY-MM-DD",
 *     doc_types?: DocType[],          // ["boc", "rapport_annuel", ...]
 *     source_slugs?: string[],         // ["brvm-org"]
 *     force?: boolean,                 // re-télécharger si déjà archivé (défaut false)
 *     limit?: number                   // max 500, défaut 50
 *   }
 *
 * Réponse : DownloadReport complet (items détaillés + counts agrégés)
 *
 * Timeout : cette route peut prendre plusieurs minutes pour de gros volumes.
 * Le client doit gérer le timeout côté fetch.
 */
export const maxDuration = 300 // 5 minutes max (limit Vercel/Next)

export async function POST(request: Request) {
  // Auth : admin session OU token interne
  const tokenCheck = checkInternalToken(request)
  if (tokenCheck) {
    // Pas de token → fallback sur session admin
    const { response } = await checkAdminSession()
    if (response) return response
  }

  // Parse body
  let body: DownloadRequest = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  // Validation des doc_types si fournis
  if (body.doc_types) {
    const invalid = body.doc_types.filter(
      (t) => !(DOC_TYPES as readonly string[]).includes(t)
    )
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `doc_types invalides: ${invalid.join(', ')}. Valides: ${DOC_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validation dates (format ISO simple)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (body.date_from && !dateRegex.test(body.date_from)) {
    return NextResponse.json({ error: 'date_from doit être au format YYYY-MM-DD' }, { status: 400 })
  }
  if (body.date_to && !dateRegex.test(body.date_to)) {
    return NextResponse.json({ error: 'date_to doit être au format YYYY-MM-DD' }, { status: 400 })
  }
  if (body.date_from && body.date_to && body.date_from > body.date_to) {
    return NextResponse.json({ error: 'date_from doit être <= date_to' }, { status: 400 })
  }

  // Limit hard cap
  const limit = Math.min(body.limit ?? 50, 500)

  try {
    const report = await downloadByPeriod({
      ...body,
      doc_types: body.doc_types as DocType[] | undefined,
      limit,
    })
    return NextResponse.json({ ok: true, report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[api/brvm/download] error:', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

/**
 * GET /api/brvm/download?document_id=XXX
 *
 * Renvoie une signed URL pour télécharger un PDF déjà archivé.
 * Utilisé par l'UI admin "Voir le fichier archivé".
 */
export async function GET(request: Request) {
  const { response } = await checkAdminSession()
  if (response) return response

  const url = new URL(request.url)
  const docId = url.searchParams.get('document_id')
  if (!docId) {
    return NextResponse.json({ error: 'document_id requis' }, { status: 400 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: doc } = await db
    .from('brvm_documents')
    .select('id, title, metadata')
    .eq('id', docId)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  const storagePath = (doc.metadata as Record<string, unknown> | null)?.storage_path
  if (typeof storagePath !== 'string') {
    return NextResponse.json(
      { error: 'Document non archivé (aucun PDF téléchargé côté serveur). Lance un download par période pour l\'archiver.' },
      { status: 404 }
    )
  }

  const { getSignedDownloadUrl } = await import('@/lib/brvm/pdf-downloader')
  const signedUrl = await getSignedDownloadUrl(storagePath, 300)
  if (!signedUrl) {
    return NextResponse.json({ error: 'Erreur génération signed URL' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl)
}
