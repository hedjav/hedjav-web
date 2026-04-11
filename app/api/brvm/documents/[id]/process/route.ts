import { NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/brvm/auth'
import { markProcessed } from '@/lib/brvm/documents'

/**
 * POST /api/brvm/documents/[id]/process
 * Marque un document BRVM comme "traité" par l'admin (sort de l'onglet Nouveautés).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response, userId } = await checkAdminSession()
  if (response) return response

  const { id } = await params
  const ok = await markProcessed(id, userId)
  if (!ok) {
    return NextResponse.json({ error: 'Erreur marquage document' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
