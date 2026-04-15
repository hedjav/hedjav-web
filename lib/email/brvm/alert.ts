/**
 * Email d'alerte BRVM instantanée.
 *
 * Déclenché quand une ou plusieurs nouveautés BRVM méritent une notification
 * immédiate (scoring `priority` ou règle produit type BOC du jour). Plus
 * court qu'un digest, avec en-tête accentué orange ou or si BOC.
 */

import { C, hr, layout, smallNote } from '../templates'
import type { EnrichedDocument } from '@/lib/brvm/ai/types'
import {
  badge,
  ctaButton,
  docRow,
  familyTag,
  preheader,
  SITE_URL,
} from './primitives'
import { DOC_SUBTYPE_LABELS, type DocFamily } from '@/lib/brvm/types'

type BuildAlertOptions = {
  docs: EnrichedDocument[]
  headline?: string
  rationale?: string
  importance?: 'priority' | 'important' | 'useful'
  aiProvider?: string | null
}

export function buildBrvmAlertEmail(options: BuildAlertOptions): {
  subject: string
  html: string
  text: string
} {
  const {
    docs,
    headline,
    rationale,
    importance = 'important',
    aiProvider,
  } = options

  if (docs.length === 0) {
    // Pas d'email vide
    return {
      subject: '[BRVM] Aucune nouveauté prioritaire',
      html: layout({
        preheader: 'Aucune nouveauté BRVM',
        bodyHtml: `<p>Aucune alerte à remonter pour cette période.</p>`,
      }),
      text: 'Aucune alerte à remonter.',
    }
  }

  const main = docs[0]
  const mainFamily = (main.doc_family ?? 'publication') as DocFamily
  const mainEmetteur = main.emetteur?.name ?? main.issuer_name ?? null
  const mainSubtype =
    (DOC_SUBTYPE_LABELS as Record<string, string>)[main.doc_subtype ?? ''] ??
    main.doc_subtype ??
    main.doc_type

  const subject = headline
    ? `[BRVM] ${headline}`
    : `[BRVM] ${mainSubtype}${mainEmetteur ? ` — ${mainEmetteur}` : ''}${docs.length > 1 ? ` + ${docs.length - 1} autre${docs.length > 2 ? 's' : ''}` : ''}`

  const importanceBadge =
    importance === 'priority'
      ? badge('Priorité élevée', '#B23A48')
      : importance === 'important'
        ? badge('Important', C.gold)
        : badge('À suivre', C.navy)

  const header = `
    <div style="margin-bottom:14px;">${importanceBadge} ${familyTag(mainFamily)}</div>
    <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:${C.navy};line-height:1.25;">
      ${escapePlain(headline ?? `${mainSubtype}${mainEmetteur ? ` — ${mainEmetteur}` : ''}`)}
    </h1>
    ${
      rationale
        ? `<p style="margin:0 0 20px;color:${C.muted};font-size:14px;line-height:1.6;">${escapePlain(rationale)}</p>`
        : ''
    }
  `

  const docsTable = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      ${docs.map(docRow).join('')}
    </table>
  `

  const footer = smallNote(
    `Alerte BRVM automatique — envoi déclenché par règle ${importance}.${aiProvider ? ` Qualification IA via ${escapePlain(aiProvider)}.` : ''}`
  )

  const body = `
    ${header}
    ${docsTable}
    ${ctaButton()}
    ${hr()}
    ${footer}
  `

  return {
    subject,
    html: layout({
      preheader: preheader(docs.length, 'alerte instantanée'),
      bodyHtml: body,
    }),
    text: buildAlertTextVersion({ headline, docs, rationale }),
  }
}

function buildAlertTextVersion(opts: {
  headline?: string
  docs: EnrichedDocument[]
  rationale?: string
}): string {
  const lines: string[] = []
  if (opts.headline) lines.push(opts.headline)
  if (opts.rationale) {
    lines.push(opts.rationale)
    lines.push('')
  }
  for (const d of opts.docs) {
    const date = d.doc_date ?? d.discovered_at.slice(0, 10)
    const meta = d.emetteur?.name ?? d.issuer_name ?? ''
    lines.push(
      `- ${date}${meta ? ` | ${meta}` : ''} | ${d.title}${d.pdf_url ? ` — ${d.pdf_url}` : ''}`
    )
  }
  lines.push('')
  lines.push(`Hub : ${SITE_URL}/admin/brvm`)
  return lines.join('\n')
}

function escapePlain(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
