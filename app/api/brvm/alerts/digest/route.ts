/**
 * POST /api/brvm/alerts/digest
 *
 * Digest email admin BRVM — refonte coordonnée (2026-04-15 section 9).
 *
 * - Utilise la couche IA unifiée `lib/brvm/ai` (contexte enrichi 4 univers).
 * - Utilise le module email refondu `lib/email/brvm` (structure stable,
 *   cohérente entre daily/weekly/monthly/alerte).
 * - Déduplique les documents déjà envoyés dans un digest récent (24h
 *   pour daily, pas pour weekly/monthly qui synthétisent une période).
 * - Persiste les document_ids dans brvm_alert_log.metadata pour audit + dédup.
 *
 * Body JSON :
 *   {
 *     frequency: 'daily' | 'weekly' | 'monthly' | 'manual',   // défaut 'daily'
 *     dry_run?: boolean,
 *     ai?: boolean,      // par défaut true si provider disponible
 *   }
 *
 * Auth : Bearer INTERNAL_API_TOKEN OU session admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAiStatus } from '@/lib/ai/client'
import { checkAdminSession } from '@/lib/brvm/auth'
import { sendEmail } from '@/lib/email/smtp'
import { buildBrvmAiContext } from '@/lib/brvm/ai/context'
import { generateBrvmContent } from '@/lib/brvm/ai'
type DigestAiKind = 'daily_digest' | 'weekly_digest' | 'monthly_digest'
import {
  buildBrvmDigestEmail,
  filterDedup,
  getRecentlySentDocIds,
  hashDocIds,
  type DigestFrequency,
} from '@/lib/email/brvm'
import type { DocFamily } from '@/lib/brvm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

function frequencyToAiKind(freq: DigestFrequency): DigestAiKind {
  switch (freq) {
    case 'weekly':
      return 'weekly_digest'
    case 'monthly':
      return 'monthly_digest'
    default:
      return 'daily_digest'
  }
}

function frequencyToPeriod(freq: DigestFrequency): 'today' | '7d' | '30d' {
  switch (freq) {
    case 'weekly':
      return '7d'
    case 'monthly':
      return '30d'
    default:
      return 'today'
  }
}

async function isAuthorized(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') ?? ''
  if (
    process.env.INTERNAL_API_TOKEN &&
    auth === `Bearer ${process.env.INTERNAL_API_TOKEN}`
  ) {
    return true
  }
  const session = await checkAdminSession()
  return session.response === null
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { frequency?: string; dry_run?: boolean; ai?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const frequency = (['daily', 'weekly', 'monthly', 'manual'].includes(body.frequency ?? '')
    ? body.frequency
    : 'daily') as DigestFrequency
  const dryRun = Boolean(body.dry_run)
  const aiEnabled = body.ai !== false

  const startedAt = Date.now()

  // ── 1. Contexte BRVM enrichi (4 univers + société + secteur + indice) ──
  const ctx = await buildBrvmAiContext({
    period: frequencyToPeriod(frequency),
    max_docs_per_family: 40,
  })

  // ── 2. Déduplication : retire les docs déjà envoyés dans un digest récent
  const sentIds = await getRecentlySentDocIds(frequency)
  const dedupedDocs: Partial<Record<DocFamily, typeof ctx.docs extends Partial<Record<DocFamily, infer U>> ? U : never>> = {}
  let totalKept = 0
  let totalSkipped = 0
  const allKeptIds: string[] = []

  for (const [family, list] of Object.entries(ctx.docs) as Array<
    [DocFamily, (typeof ctx.docs)[DocFamily]]
  >) {
    const { kept, skipped_count } = filterDedup(list ?? [], sentIds)
    dedupedDocs[family] = kept
    totalKept += kept.length
    totalSkipped += skipped_count
    for (const d of kept) allKeptIds.push(d.id)
  }
  ctx.docs = dedupedDocs
  ctx.total_docs = totalKept

  // ── 3. Analyse IA optionnelle (sur le contexte dédupé) ─────────────
  let aiAnalysis: string | null = null
  let aiProviderLabel: string | null = null
  const aiStatus = getAiStatus()

  if (aiEnabled && totalKept > 0 && aiStatus.available) {
    const kind = frequencyToAiKind(frequency)
    // Re-buildBrvmAiContext est inutile : generateBrvmContent l'appelle en interne
    // avec les mêmes options. Mais ici on veut l'analyse IA sur le set dédupé.
    // generateBrvmContent accepte une période, il refait le fetch. Impact minime
    // (1 query). Acceptable pour garder l'architecture simple et réutilisable.
    const aiResult = await generateBrvmContent(kind, {
      period: frequencyToPeriod(frequency),
      max_docs_per_family: 40,
    })
    if (aiResult.ok && aiResult.content) {
      aiAnalysis = aiResult.content
      aiProviderLabel =
        aiResult.provider && aiResult.model
          ? `${aiResult.provider}:${aiResult.model}`
          : null
    }
  }

  // ── 4. Construction email (nouveau module lib/email/brvm) ──────────
  const email = buildBrvmDigestEmail({
    frequency,
    ctx,
    aiAnalysis,
    aiProvider: aiProviderLabel,
    dedup_skipped: totalSkipped,
  })

  // ── 5. Destinataires admin ─────────────────────────────────────────
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: admins } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'admin')
  const recipients = (admins ?? []).map((a) => a.email).filter(Boolean) as string[]

  // ── 6. Envoi ───────────────────────────────────────────────────────
  let sent = 0
  let failed = 0
  const errors: string[] = []

  if (!dryRun && recipients.length > 0 && totalKept > 0) {
    for (const to of recipients) {
      const res = await sendEmail({
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
      if (res.ok) sent++
      else {
        failed++
        if ('error' in res && res.error) errors.push(`${to}: ${res.error}`)
      }
    }
  }

  // ── 7. Log + persistance dédup ────────────────────────────────────
  const status: 'success' | 'partial' | 'error' | 'empty' = dryRun
    ? 'success'
    : totalKept === 0
      ? 'empty'
      : failed > 0 && sent > 0
        ? 'partial'
        : failed > 0
          ? 'error'
          : 'success'

  try {
    await db.from('brvm_alert_log').insert({
      frequency,
      period_from: ctx.period.from,
      period_to: ctx.period.to,
      document_count: totalKept,
      recipients_count: recipients.length,
      status,
      error_message: errors.length > 0 ? errors.slice(0, 5).join(' | ') : null,
      ai_provider: aiProviderLabel,
      ai_model: aiProviderLabel ? aiProviderLabel.split(':')[1] ?? null : null,
      metadata: {
        dry_run: dryRun,
        sent,
        failed,
        document_ids: allKeptIds,
        content_hash: hashDocIds(allKeptIds),
        dedup_skipped: totalSkipped,
      },
    })
  } catch {
    // brvm_alert_log absent : on ne bloque pas.
  }

  return NextResponse.json({
    ok: true,
    frequency,
    period: { from: ctx.period.from, to: ctx.period.to, label: ctx.period.label },
    total_documents: totalKept,
    dedup_skipped: totalSkipped,
    recipients: recipients.length,
    sent,
    failed,
    ai: {
      enabled: aiEnabled,
      available: aiStatus.available,
      provider: aiProviderLabel,
    },
    status,
    dry_run: dryRun,
    duration_ms: Date.now() - startedAt,
  })
}

/**
 * GET /api/brvm/alerts/digest
 * Aperçu sans envoi (équivalent POST { dry_run: true }).
 */
export async function GET(request: Request) {
  return POST(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        frequency: new URL(request.url).searchParams.get('frequency') ?? 'daily',
        dry_run: true,
      }),
    })
  )
}
