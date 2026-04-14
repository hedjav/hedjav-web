import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText, getAiStatus } from '@/lib/ai/client'
import { listDocumentsGroupedByType } from '@/lib/brvm/documents'
import { resolvePeriod, type PeriodPreset } from '@/lib/brvm/periods'
import { DOC_TYPE_LABELS } from '@/lib/brvm/types'
import { sendEmail } from '@/lib/email/smtp'
import { brvmDocDigestEmail } from '@/lib/email/templates'
import { checkAdminSession } from '@/lib/brvm/auth'

/**
 * POST /api/brvm/alerts/digest
 *
 * Digest email admin des publications BRVM sur une fréquence donnée.
 *
 * Auth :
 *  - Bearer INTERNAL_API_TOKEN (cron externe), OU
 *  - Session admin (bouton « Envoyer maintenant » dans /admin/brvm/alertes).
 *
 * Body JSON :
 *  {
 *    frequency: 'daily' | 'weekly' | 'monthly' | 'manual',  // défaut 'daily'
 *    dry_run?: boolean,     // si true : calcule mais n'envoie pas
 *    ai?: boolean,          // désactive l'IA même si configurée (défaut true)
 *  }
 */

function periodForFrequency(frequency: string): PeriodPreset {
  switch (frequency) {
    case 'weekly':
      return '7d'
    case 'monthly':
      return '30d'
    case 'daily':
    case 'manual':
    default:
      return 'today'
  }
}

async function isAuthorized(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') ?? ''
  if (process.env.INTERNAL_API_TOKEN && auth === `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
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
    : 'daily') as 'daily' | 'weekly' | 'monthly' | 'manual'
  const dryRun = Boolean(body.dry_run)
  const aiEnabled = body.ai !== false

  const period = resolvePeriod(periodForFrequency(frequency))
  const startedAt = Date.now()

  // ── 1. Charger les documents groupés par type ────────────────
  const grouped = await listDocumentsGroupedByType(period, { limit_per_type: 25 })
  const totalCount = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0)

  const groupedForEmail: Record<string, { label: string; docs: Array<Record<string, unknown>> }> = {}
  for (const [key, docs] of Object.entries(grouped)) {
    groupedForEmail[key] = {
      label: (DOC_TYPE_LABELS as Record<string, string>)[key] ?? key,
      docs: docs.map((d) => ({
        id: d.id,
        doc_type: d.doc_type,
        doc_type_label: (DOC_TYPE_LABELS as Record<string, string>)[d.doc_type] ?? d.doc_type,
        title: d.title,
        issuer_name: d.issuer_name,
        source_name: d.source_name,
        doc_date: d.doc_date,
        discovered_at: d.discovered_at,
        pdf_url: d.pdf_url,
        source_url: d.source_url,
      })),
    }
  }

  // ── 2. Analyse IA optionnelle (DeepSeek prioritaire) ─────────
  let aiAnalysis: string | null = null
  let aiProvider: string | null = null
  const aiStatus = getAiStatus()

  if (aiEnabled && totalCount > 0 && aiStatus.available) {
    const headlines = Object.entries(groupedForEmail)
      .flatMap(([, g]) => g.docs.slice(0, 5).map((d) => `- [${g.label}] ${d.title}${d.issuer_name ? ` (${d.issuer_name})` : ''}`))
      .slice(0, 40)
      .join('\n')

    const prompt = `Tu es analyste financier senior couvrant la BRVM (Bourse Régionale des Valeurs Mobilières, zone UEMOA).

Voici les ${totalCount} publications BRVM de la période ${period.label.toLowerCase()} :

${headlines}

Rédige en 120 à 180 mots, en français professionnel, une note de synthèse pour les administrateurs de l'École de la Gestion de Patrimoine (EGP / Hedjav). Mets en avant :
- ce qui mérite une lecture prioritaire (BOC, rapports annuels, annonces majeures)
- les secteurs ou émetteurs particulièrement actifs cette période
- les signaux qui peuvent déclencher une note d'analyse ou un article éditorial

Style : direct, concret, pas de phrases creuses. Pas d'introduction type "voici la synthèse". Entre directement dans le vif.`

    const result = await generateText({
      system:
        "Tu rédiges pour l'équipe éditoriale de egp.hedjav.com. Priorité produit : BOC, rapports cotés UEMOA. Langue : français. Concret, factuel.",
      prompt,
      maxTokens: 520,
      temperature: 0.5,
      action: `brvm_digest_${frequency}`,
    })

    if (result.ok) {
      aiAnalysis = result.text
      aiProvider = `${result.provider}:${result.model}`
    }
  }

  // ── 3. Destinataires : tous les admins actifs ────────────────
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: admins } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'admin')

  const recipients = (admins ?? []).map((a) => a.email).filter(Boolean) as string[]

  // ── 4. Rendu + envoi ─────────────────────────────────────────
  const email = brvmDocDigestEmail({
    frequency,
    periodLabel: period.label,
    groupedDocs: groupedForEmail as Parameters<typeof brvmDocDigestEmail>[0]['groupedDocs'],
    totalCount,
    aiAnalysis,
    aiProvider,
  })

  let sent = 0
  let failed = 0
  const errors: string[] = []

  if (!dryRun && recipients.length > 0) {
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

  // ── 5. Log dans brvm_alert_log ───────────────────────────────
  const status: 'success' | 'partial' | 'error' | 'empty' =
    dryRun
      ? 'success'
      : totalCount === 0
        ? 'empty'
        : failed > 0 && sent > 0
          ? 'partial'
          : failed > 0
            ? 'error'
            : 'success'

  try {
    await db.from('brvm_alert_log').insert({
      frequency,
      period_from: period.from,
      period_to: period.to,
      document_count: totalCount,
      recipients_count: recipients.length,
      status,
      error_message: errors.length > 0 ? errors.slice(0, 5).join(' | ') : null,
      ai_provider: aiProvider,
      ai_model: aiProvider ? aiProvider.split(':')[1] : null,
      metadata: { dry_run: dryRun, sent, failed },
    })
  } catch {
    // brvm_alert_log absent : on ne bloque pas le digest (migration 025 pas appliquée).
  }

  return NextResponse.json({
    ok: true,
    frequency,
    period: { from: period.from, to: period.to, label: period.label },
    total_documents: totalCount,
    recipients: recipients.length,
    sent,
    failed,
    ai: {
      enabled: aiEnabled,
      available: aiStatus.available,
      provider: aiProvider,
    },
    status,
    dry_run: dryRun,
    duration_ms: Date.now() - startedAt,
  })
}

/**
 * GET /api/brvm/alerts/digest
 * Permet d'inspecter sans envoyer (équivalent POST { dry_run: true }).
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
    }),
  )
}
