/**
 * POST /api/brvm/scrape/emetteurs
 *
 * Seed + sync du référentiel brvm_emetteurs (migration 027).
 * Tente brvm.org, fallback sur seed hardcodé. Idempotent.
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { scrapeEmetteurs } from '@/lib/brvm/scrapers/emetteurs'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  // Auth dual : bearer OU session admin
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry_run') === '1'

  try {
    const result = await scrapeEmetteurs({ dryRun })
    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api/brvm/scrape/emetteurs] error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
