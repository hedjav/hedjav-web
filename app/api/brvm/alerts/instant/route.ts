/**
 * POST /api/brvm/alerts/instant
 *
 * Envoi d'une alerte BRVM **instantanée** à tous les admins, pour 1 à N
 * documents jugés prioritaires (scoring IA `priority` ou sélection manuelle).
 *
 * Cohérent avec le digest : même charte, même primitives (lib/email/brvm/),
 * mais template dédié `buildBrvmAlertEmail` plus court et plus accentué.
 *
 * Body JSON :
 *   {
 *     document_ids: string[],                 // 1-10 ids max
 *     headline?: string,                      // titre d'email custom
 *     rationale?: string,                     // paragraphe de contexte
 *     importance?: 'priority' | 'important' | 'useful',   // défaut 'important'
 *     dry_run?: boolean,
 *   }
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminSession, checkInternalToken } from '@/lib/brvm/auth'
import { sendEmail } from '@/lib/email/smtp'
import { buildBrvmAlertEmail, filterDedup, getRecentlySentDocIds, hashDocIds } from '@/lib/email/brvm'
import type { BrvmDocument, BrvmEmetteur } from '@/lib/brvm/types'
import type { EnrichedDocument } from '@/lib/brvm/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const bearerCheck = checkInternalToken(request)
  if (bearerCheck) {
    const adminCheck = await checkAdminSession()
    if (adminCheck.response) return adminCheck.response
  }

  let body: {
    document_ids?: string[]
    headline?: string
    rationale?: string
    importance?: 'priority' | 'important' | 'useful'
    dry_run?: boolean
  } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!Array.isArray(body.document_ids) || body.document_ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'document_ids requis (1 à 10)' },
      { status: 400 }
    )
  }
  const ids = body.document_ids.slice(0, 10)

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await db
    .from('brvm_documents')
    .select(
      `id, source_id, doc_type, doc_family, doc_subtype, emetteur_id, doc_date,
       title, description, source_url, pdf_url, issuer_slug, issuer_name, sector,
       market_index, checksum, is_new, is_processed, processed_at, processed_by,
       discovered_at, published_at, metadata, created_at, updated_at,
       brvm_sources!inner(slug, name),
       brvm_emetteurs(slug, name, ticker, sector, indices)`
    )
    .in('id', ids)
    .order('doc_date', { ascending: false, nullsFirst: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const docs: EnrichedDocument[] = (data ?? []).map((r) => {
    const rec = r as unknown as BrvmDocument & {
      brvm_sources: { slug: string; name: string } | null
      brvm_emetteurs: Pick<BrvmEmetteur, 'slug' | 'name' | 'ticker' | 'sector' | 'indices'> | null
    }
    return {
      ...rec,
      source_name: rec.brvm_sources?.name ?? '',
      source_slug: rec.brvm_sources?.slug ?? '',
      emetteur: rec.brvm_emetteurs,
    }
  })

  // Dédup : exclure ceux déjà envoyés en alerte dans les 12h
  const recentlySent = await getRecentlySentDocIds('manual')
  const { kept, skipped_count } = filterDedup(docs, recentlySent)

  if (kept.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped_duplicates: skipped_count,
      note: 'Tous les documents ont déjà été envoyés récemment.',
    })
  }

  const email = buildBrvmAlertEmail({
    docs: kept,
    headline: body.headline,
    rationale: body.rationale,
    importance: body.importance ?? 'important',
  })

  const { data: admins } = await db
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
  const recipients = (admins ?? []).map((a) => a.email).filter(Boolean) as string[]

  let sent = 0
  let failed = 0
  if (!body.dry_run) {
    for (const to of recipients) {
      const res = await sendEmail({
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
      if (res.ok) sent++
      else failed++
    }
  }

  // Log dans brvm_alert_log (frequency=manual)
  const keptIds = kept.map((d) => d.id)
  try {
    await db.from('brvm_alert_log').insert({
      frequency: 'manual',
      period_from: null,
      period_to: null,
      document_count: kept.length,
      recipients_count: recipients.length,
      status: body.dry_run ? 'success' : failed === 0 ? 'success' : sent > 0 ? 'partial' : 'error',
      ai_provider: null,
      ai_model: null,
      metadata: {
        dry_run: Boolean(body.dry_run),
        sent,
        failed,
        alert_type: 'instant',
        importance: body.importance ?? 'important',
        document_ids: keptIds,
        content_hash: hashDocIds(keptIds),
        dedup_skipped: skipped_count,
        headline: body.headline ?? null,
      },
    })
  } catch {
    // log optionnel, on n'échoue pas pour ça
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    recipients: recipients.length,
    documents: kept.length,
    skipped_duplicates: skipped_count,
    subject: email.subject,
    dry_run: Boolean(body.dry_run),
  })
}
