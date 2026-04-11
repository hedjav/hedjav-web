#!/usr/bin/env node
/**
 * scripts/cancel-stale-purchases.ts
 *
 * Marque comme `failed` (auto-cancelled) les purchases `pending` plus vieilles
 * qu'une durée donnée. À lancer en cron quotidien pour éviter l'accumulation
 * de pending quand un client annule côté FedaPay sans webhook.
 *
 * Usage :
 *   npx tsx scripts/cancel-stale-purchases.ts              # cancel > 2h
 *   npx tsx scripts/cancel-stale-purchases.ts --hours=24   # cancel > 24h
 *   npx tsx scripts/cancel-stale-purchases.ts --dry-run    # liste seulement
 *
 * Cron recommandé (cron-job.org) :
 *   POST https://egp.hedjav.com/api/admin/purchases/cancel-stale?hours=2
 *   Header: Authorization: Bearer $INTERNAL_API_TOKEN
 *   Fréquence: toutes les heures
 */

import { createClient } from '@supabase/supabase-js'

function parseArgs(): { hours: number; dryRun: boolean } {
  const args = process.argv.slice(2)
  let hours = 2
  let dryRun = false
  for (const a of args) {
    if (a === '--dry-run') dryRun = true
    else if (a.startsWith('--hours=')) hours = Number(a.slice(8))
    else if (a === '--help') {
      console.log(`
scripts/cancel-stale-purchases.ts — Auto-cancel des pending BRVM abandonnées

Options :
  --hours=N     Âge minimum en heures pour canceller (défaut 2)
  --dry-run     Liste seulement, ne modifie rien

Exemples :
  npx tsx scripts/cancel-stale-purchases.ts
  npx tsx scripts/cancel-stale-purchases.ts --hours=24 --dry-run
`)
      process.exit(0)
    }
  }
  if (isNaN(hours) || hours < 0.1 || hours > 720) {
    console.error(`hours invalide : ${hours}`)
    process.exit(2)
  }
  return { hours, dryRun }
}

async function main() {
  const { hours, dryRun } = parseArgs()

  console.log(`[cancel-stale] cutoff: ${hours}h — mode: ${dryRun ? 'DRY-RUN' : 'RÉEL'}`)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString()

  const { data: stale, error } = await admin
    .from('purchases')
    .select('id, email, amount, created_at, payment_ref, ebook:ebooks(title)')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`[cancel-stale] erreur Supabase: ${error.message}`)
    process.exit(1)
  }

  const candidates = stale ?? []
  console.log(`[cancel-stale] ${candidates.length} purchases pending > ${hours}h trouvées\n`)

  if (candidates.length === 0) {
    console.log('[cancel-stale] rien à faire.')
    return
  }

  if (dryRun) {
    for (const p of candidates.slice(0, 30)) {
      const ageH = ((Date.now() - new Date(p.created_at).getTime()) / 3600000).toFixed(1)
      const ebook = Array.isArray(p.ebook) ? p.ebook[0] : p.ebook
      console.log(
        `  [DRY] ${p.id.slice(0, 8)} ${p.email.padEnd(30)} ${p.amount} FCFA · ${ageH}h · ${ebook?.title ?? '?'}`
      )
    }
    if (candidates.length > 30) console.log(`  ... et ${candidates.length - 30} de plus`)
    return
  }

  let cancelled = 0
  const errors: string[] = []
  for (const p of candidates) {
    const { error: updErr } = await admin
      .from('purchases')
      .update({
        status: 'failed',
        raw_payload: {
          cancelled: true,
          reason: 'stale_pending',
          auto: true,
          cancelled_at: new Date().toISOString(),
          cutoff_hours: hours,
        },
      })
      .eq('id', p.id)
      .eq('status', 'pending')
    if (updErr) errors.push(`${p.id}: ${updErr.message}`)
    else cancelled++
  }

  console.log(`[cancel-stale] ${cancelled}/${candidates.length} cancellées`)
  if (errors.length > 0) {
    console.error(`[cancel-stale] ${errors.length} erreurs :`)
    errors.slice(0, 5).forEach((e) => console.error(`  ${e}`))
  }
}

main().catch((e) => {
  console.error('[cancel-stale] Fatal:', e)
  process.exit(1)
})
