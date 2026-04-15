/**
 * Email digest BRVM — structure unique pour daily / weekly / monthly / manual.
 *
 * Principe : le système sélectionne et classe (univers → sous-type → docs),
 * l'IA enrichit en amont avec une note d'analyse. L'email reste structurellement
 * stable, l'IA ne modifie jamais la structure — seulement le paragraphe du haut.
 *
 * Hiérarchie visuelle (cohérente avec l'UI admin BRVM) :
 *   1. Badge fréquence + titre + préambule
 *   2. KPIs (total, univers touchés, secteurs actifs)
 *   3. Note d'analyse IA (si fournie)
 *   4. 4 sections univers (ordre fixe : publication → report → announcement → market)
 *      4.1 Titre univers (couleur pastel dédiée)
 *      4.2 Sous-groupes par doc_subtype
 *      4.3 Docs triés DESC par doc_date
 *   5. CTA Centre de Veille BRVM
 *   6. Footer sobre (fréquence, dédup info, provider IA)
 */

import { C, hr, layout, smallNote } from '../templates'
import type { DocFamily } from '@/lib/brvm/types'
import { DOC_FAMILY_LABELS } from '@/lib/brvm/types'
import type { BrvmAiContext, EnrichedDocument } from '@/lib/brvm/ai/types'
import {
  aiBlock,
  badge,
  ctaButton,
  docRow,
  emptyBlock,
  FAMILY_PALETTE,
  kpiRow,
  preheader,
  sectionTitle,
  SITE_URL,
  subtypeHeader,
} from './primitives'

export type DigestFrequency = 'daily' | 'weekly' | 'monthly' | 'manual'

const FREQ_LABELS: Record<DigestFrequency, string> = {
  daily: 'quotidienne',
  weekly: 'hebdomadaire',
  monthly: 'mensuelle',
  manual: 'manuelle',
}

const FREQ_BADGES: Record<DigestFrequency, string> = {
  daily: 'Digest journalier',
  weekly: 'Digest hebdomadaire',
  monthly: 'Digest mensuel',
  manual: 'Digest manuel',
}

/** Ordre fixe des univers dans l'email (cohérent avec le sidebar admin). */
const UNIVERSE_ORDER: DocFamily[] = ['publication', 'report', 'announcement', 'market']

type BuildDigestOptions = {
  frequency: DigestFrequency
  ctx: BrvmAiContext
  aiAnalysis?: string | null
  aiProvider?: string | null
  /** Nombre de docs déjà envoyés dans un digest précédent (info affichée, pas bloquant). */
  dedup_skipped?: number
}

/**
 * Construit un email digest BRVM à partir du contexte IA enrichi.
 * Renvoie subject + html + text.
 */
export function buildBrvmDigestEmail(options: BuildDigestOptions): {
  subject: string
  html: string
  text: string
} {
  const { frequency, ctx, aiAnalysis, aiProvider, dedup_skipped = 0 } = options
  const totalDocs = ctx.total_docs

  const topSectors = Object.entries(ctx.facets.by_sector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([s]) => s)

  const topIndex = Object.entries(ctx.facets.by_index)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([i]) => i)

  const kpis = [
    { label: 'Documents', value: totalDocs },
    { label: 'Émetteurs actifs', value: ctx.facets.top_emetteurs.length },
    {
      label: 'Secteurs',
      value: topSectors.length > 0 ? topSectors.join(' · ') : '—',
    },
    {
      label: 'Indices',
      value: topIndex.length > 0 ? topIndex[0] : '—',
    },
  ]

  /* ── Sections univers ────────────────────────────────────────── */

  const universeSections = UNIVERSE_ORDER.map((family) => {
    const docs = ctx.docs[family] ?? []
    if (docs.length === 0) return ''
    return renderUniverseSection(family, docs)
  })
    .filter(Boolean)
    .join('')

  /* ── En-tête ──────────────────────────────────────────────────── */

  const header = `
    <div style="margin-bottom:14px;">${badge(FREQ_BADGES[frequency].toUpperCase())}</div>
    <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${C.navy};line-height:1.25;letter-spacing:-0.01em;">
      Veille BRVM — synthèse ${FREQ_LABELS[frequency]}
    </h1>
    <p style="margin:0 0 24px;color:${C.muted};font-size:14px;line-height:1.6;">
      ${escapePlain(ctx.period.label)} · ${totalDocs} publication${totalDocs !== 1 ? 's' : ''} classée${totalDocs !== 1 ? 's' : ''} par univers métier, tri du plus récent au plus ancien.
    </p>
  `

  /* ── Body ─────────────────────────────────────────────────────── */

  const body = `
    ${header}
    ${totalDocs > 0 ? kpiRow(kpis) : ''}
    ${aiAnalysis ? aiBlock(aiAnalysis, aiProvider ?? null) : ''}
    ${totalDocs === 0 ? emptyBlock() : universeSections}
    ${ctaButton()}
    ${hr()}
    ${smallNote(
      buildFooterNote({
        frequency,
        aiProvider: aiProvider ?? null,
        hasAi: Boolean(aiAnalysis),
        dedup_skipped,
      })
    )}
  `

  const subject = `[BRVM ${FREQ_LABELS[frequency]}] ${totalDocs} publication${totalDocs !== 1 ? 's' : ''} · ${ctx.period.label}`

  return {
    subject,
    html: layout({
      preheader: preheader(totalDocs, ctx.period.label),
      bodyHtml: body,
    }),
    text: buildTextVersion({ frequency, ctx, aiAnalysis, aiProvider }),
  }
}

/* ──────────────────────────────────────────────────────────────── */

function renderUniverseSection(family: DocFamily, docs: EnrichedDocument[]): string {
  // Regroupement par doc_subtype
  const grouped = new Map<string, EnrichedDocument[]>()
  for (const d of docs) {
    const key = d.doc_subtype ?? d.doc_type ?? 'autre'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(d)
  }

  const subtypeBlocks = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length) // plus gros groupes d'abord
    .map(
      ([subtype, rows]) => `
        ${subtypeHeader(subtype, rows.length)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows.map(docRow).join('')}
        </table>
      `
    )
    .join('')

  return `
    <section style="margin:0 0 8px;">
      ${sectionTitle(family, docs.length)}
      ${subtypeBlocks}
    </section>
  `
}

function buildFooterNote(opts: {
  frequency: DigestFrequency
  aiProvider: string | null
  hasAi: boolean
  dedup_skipped: number
}): string {
  const bits: string[] = [
    `Digest ${FREQ_LABELS[opts.frequency]} — envoi automatique.`,
  ]
  if (opts.hasAi && opts.aiProvider) {
    bits.push(`Analyse IA via ${opts.aiProvider}.`)
  } else {
    bits.push('Analyse IA désactivée (aucun provider configuré).')
  }
  if (opts.dedup_skipped > 0) {
    bits.push(
      `${opts.dedup_skipped} document${opts.dedup_skipped > 1 ? 's' : ''} déjà envoyé${opts.dedup_skipped > 1 ? 's' : ''} dans un digest précédent, exclu${opts.dedup_skipped > 1 ? 's' : ''}.`
    )
  }
  return bits.join(' ')
}

function escapePlain(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildTextVersion(options: {
  frequency: DigestFrequency
  ctx: BrvmAiContext
  aiAnalysis?: string | null
  aiProvider?: string | null
}): string {
  const { frequency, ctx, aiAnalysis, aiProvider } = options
  const lines: string[] = [
    `Veille BRVM — synthèse ${FREQ_LABELS[frequency]}`,
    ctx.period.label,
    `${ctx.total_docs} publication(s)`,
    '',
  ]

  if (aiAnalysis) {
    lines.push(`Analyse IA${aiProvider ? ` (${aiProvider})` : ''} :`)
    lines.push(aiAnalysis)
    lines.push('')
  }

  for (const family of UNIVERSE_ORDER) {
    const docs = ctx.docs[family] ?? []
    if (docs.length === 0) continue
    lines.push(`${DOC_FAMILY_LABELS[family].toUpperCase()} (${docs.length}):`)
    for (const d of docs) {
      const date = d.doc_date ?? d.discovered_at.slice(0, 10)
      const meta = d.emetteur?.name ?? d.issuer_name ?? ''
      lines.push(
        `  - ${date}${meta ? ` | ${meta}` : ''} | ${d.title}${d.pdf_url ? ` — ${d.pdf_url}` : ''}`
      )
    }
    lines.push('')
  }

  lines.push(`Hub : ${SITE_URL}/admin/brvm`)
  return lines.join('\n')
}

// Ré-export utile
export { FAMILY_PALETTE }
