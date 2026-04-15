/**
 * Primitives email BRVM — briques réutilisables par les 4 formats :
 *
 *   - Alerte immédiate (1 à N docs prioritaires)
 *   - Digest journalier
 *   - Digest hebdomadaire
 *   - Digest mensuel
 *
 * Toutes ces primitives partagent la charte Hedjav (navy + or + cream, Georgia
 * pour titres, Arial pour corps, tokens CSS hedjav transposés en inline email).
 * La cohérence entre formats passe par ces mêmes briques.
 */

import { siteBase } from '@/lib/url'
import { C, escapeAttr, escapeHtml } from '../templates'
import { DOC_FAMILY_LABELS, DOC_SUBTYPE_LABELS, type DocFamily } from '@/lib/brvm/types'
import type { EnrichedDocument } from '@/lib/brvm/ai/types'

const SITE_URL = siteBase()

/* ─── Palette univers (cohérence UI admin + emails) ───────────────── */

export const FAMILY_PALETTE: Record<
  DocFamily,
  { tag_bg: string; tag_fg: string; accent: string }
> = {
  market: { tag_bg: '#e7f0fa', tag_fg: '#1a4480', accent: '#1a4480' },
  report: { tag_bg: '#e8f3ec', tag_fg: '#1e5631', accent: '#1e5631' },
  announcement: { tag_bg: '#fdf2e3', tag_fg: '#7a4a0c', accent: '#7a4a0c' },
  publication: { tag_bg: '#f4ecff', tag_fg: '#4a2978', accent: '#4a2978' },
}

/** Badge fréquence ou tag (petit, couleur or, tracking wide). */
export function badge(label: string, color: string = C.gold): string {
  return `<span style="display:inline-block;padding:3px 10px;background:${color};color:${C.white};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;border-radius:4px;line-height:1.5;">${escapeHtml(label)}</span>`
}

/** Tag famille (discret, pastel). */
export function familyTag(family: DocFamily): string {
  const p = FAMILY_PALETTE[family]
  return `<span style="display:inline-block;padding:2px 8px;background:${p.tag_bg};color:${p.tag_fg};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-radius:3px;">${escapeHtml(DOC_FAMILY_LABELS[family])}</span>`
}

/** Titre de section (univers). */
export function sectionTitle(family: DocFamily, count: number): string {
  const p = FAMILY_PALETTE[family]
  return `
    <div style="margin:28px 0 14px;padding:0 0 8px;border-bottom:2px solid ${p.accent};display:flex;align-items:baseline;">
      <span style="font-family:Georgia,serif;font-size:20px;font-weight:600;color:${C.navy};">${escapeHtml(DOC_FAMILY_LABELS[family])}</span>
      <span style="margin-left:12px;font-family:monospace;font-size:12px;color:${C.muted};font-weight:600;">${count} élément${count > 1 ? 's' : ''}</span>
    </div>
  `
}

/** Sous-titre de sous-catégorie (à l'intérieur d'un univers). */
export function subtypeHeader(subtype: string, count: number): string {
  const label =
    (DOC_SUBTYPE_LABELS as Record<string, string>)[subtype] ?? subtype
  return `
    <div style="margin:18px 0 8px;display:flex;align-items:baseline;">
      <span style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${C.text};text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(label)}</span>
      <span style="margin-left:10px;font-family:monospace;font-size:11px;color:${C.muted};">${count}</span>
    </div>
  `
}

/** Ligne d'un document dans un tableau email. */
export function docRow(doc: EnrichedDocument): string {
  const date = doc.doc_date ?? doc.discovered_at.slice(0, 10)
  const emetteurName = doc.emetteur?.name ?? doc.issuer_name
  const sector = doc.emetteur?.sector ?? doc.sector
  const indices = doc.emetteur?.indices ?? (doc.market_index ? [doc.market_index] : [])

  const metaParts: string[] = [date]
  if (emetteurName) metaParts.push(escapeHtml(emetteurName))
  if (sector) metaParts.push(escapeHtml(sector))
  if (indices.length) metaParts.push(indices.map(escapeHtml).join(' · '))

  const links: string[] = []
  if (doc.pdf_url) {
    links.push(
      `<a href="${escapeAttr(doc.pdf_url)}" style="color:${C.goldDark};text-decoration:none;font-weight:600;">PDF</a>`
    )
  }
  links.push(
    `<a href="${escapeAttr(doc.source_url)}" style="color:${C.muted};text-decoration:none;">Source</a>`
  )

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${C.border};vertical-align:top;">
        <div style="font-family:monospace;font-size:11px;color:${C.muted};margin-bottom:4px;letter-spacing:.02em;">
          ${metaParts.join(' · ')}
        </div>
        <div style="font-size:14px;color:${C.text};line-height:1.5;margin-bottom:4px;font-weight:500;">
          ${escapeHtml(doc.title)}
        </div>
        <div style="font-size:11.5px;color:${C.muted};">
          ${escapeHtml(doc.source_name)} · ${links.join(' · ')}
        </div>
      </td>
    </tr>
  `
}

/** Encart analyse IA (sobre, or, sans décoration superflue). */
export function aiBlock(analysis: string, provider: string | null): string {
  return `
    <div style="margin:0 0 28px;padding:18px 22px;background:${C.cream};border-left:3px solid ${C.gold};border-radius:6px;">
      <div style="font-size:10px;color:${C.goldDark};text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin-bottom:10px;">
        Note d'analyse IA${provider ? ` · ${escapeHtml(provider)}` : ''}
      </div>
      <div style="font-size:14px;line-height:1.7;color:${C.text};white-space:pre-wrap;">${escapeHtml(analysis)}</div>
    </div>
  `
}

/** KPI en ligne (pour en-tête digest : total, nouveautés, sociétés, secteurs). */
export function kpiRow(kpis: Array<{ label: string; value: string | number }>): string {
  if (kpis.length === 0) return ''
  const cells = kpis
    .map(
      (k) => `
      <td style="padding:12px 16px;border:1px solid ${C.border};background:${C.white};text-align:center;vertical-align:middle;">
        <div style="font-family:monospace;font-size:22px;font-weight:700;color:${C.navy};line-height:1;">${escapeHtml(String(k.value))}</div>
        <div style="margin-top:4px;font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.1em;font-weight:600;">${escapeHtml(k.label)}</div>
      </td>
    `
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-collapse:collapse;">
      <tr>${cells}</tr>
    </table>
  `
}

/** Empty state éditorial. */
export function emptyBlock(message?: string): string {
  const m = message ?? 'Aucune nouveauté BRVM sur cette période. La prochaine veille se déclenchera automatiquement.'
  return `<p style="margin:0 0 24px;color:${C.muted};font-style:italic;line-height:1.6;">${escapeHtml(m)}</p>`
}

/** Préheader BRVM homogène. */
export function preheader(totalDocs: number, periodLabel: string): string {
  return `${totalDocs} document${totalDocs > 1 ? 's' : ''} BRVM · ${periodLabel}`
}

/** CTA principal vers le Centre BRVM. */
export function ctaButton(
  href: string = `${SITE_URL}/admin/brvm`,
  label: string = 'Ouvrir le Centre de Veille BRVM'
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;">
    <tr>
      <td style="background:${C.gold};border-radius:8px;">
        <a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:${C.white};text-decoration:none;letter-spacing:.3px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

export { SITE_URL }
