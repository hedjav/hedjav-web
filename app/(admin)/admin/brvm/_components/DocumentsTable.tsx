import Link from 'next/link'
import { DOC_SUBTYPE_LABELS, DOC_TYPE_LABELS } from '@/lib/brvm/types'
import type { DocFamily } from '@/lib/brvm/types'
import type { ImportanceLevel } from '@/lib/brvm/ai/types'
import { EmptyState } from './EmptyState'
import { DocumentRowActions } from './DocumentRowActions'
import { BatchGenerateBar } from './BatchGenerateBar'

export type DocumentRow = {
  id: string
  title: string
  doc_date: string | null
  discovered_at: string
  doc_type: string
  doc_family: DocFamily | null
  doc_subtype: string | null
  source_name: string
  source_slug: string
  source_url: string
  pdf_url: string | null
  issuer_name: string | null
  issuer_slug: string | null
  sector: string | null
  market_index: string | null
  is_new: boolean
  is_processed: boolean
  /** Scoring IA persisté dans metadata.ai_score (si déjà scoré). */
  ai_score?: {
    importance: ImportanceLevel
    score_100: number
    rationale?: string
    is_heuristic?: boolean
  } | null
}

type Props = {
  rows: DocumentRow[]
  total: number
  emptyMessage?: string
  emptyCta?: { href: string; label: string }
  showIssuer?: boolean
  showFamily?: boolean
  /** Libellé du lot pour le bouton « Générer un article (N) » — ex: "BOC 7j". */
  batchContextLabel?: string
}

function fmtDate(dateIso: string | null): string {
  if (!dateIso) return '—'
  try {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateIso
  }
}

function subtypeLabel(row: DocumentRow): string {
  if (row.doc_subtype && row.doc_subtype in DOC_SUBTYPE_LABELS) {
    return DOC_SUBTYPE_LABELS[row.doc_subtype as keyof typeof DOC_SUBTYPE_LABELS]
  }
  if (row.doc_type in DOC_TYPE_LABELS) {
    return DOC_TYPE_LABELS[row.doc_type as keyof typeof DOC_TYPE_LABELS]
  }
  return row.doc_subtype ?? row.doc_type
}

export function DocumentsTable({
  rows,
  total,
  emptyMessage = 'Aucun document pour ces filtres.',
  emptyCta,
  showIssuer = true,
  showFamily = false,
  batchContextLabel,
}: Props) {
  if (rows.length === 0) {
    return <EmptyState title="Rien à afficher" message={emptyMessage} cta={emptyCta} />
  }

  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--admin-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--admin-text-muted)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--admin-text)' }}>{rows.length}</strong>
          {total > rows.length ? ` / ${total}` : ''} document{rows.length > 1 ? 's' : ''}
          <span style={{ marginLeft: 10, opacity: 0.7 }}>· Tri : plus récent en haut</span>
        </span>
        <BatchGenerateBar
          visibleIds={rows.map((r) => r.id)}
          contextLabel={batchContextLabel}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--fb)',
            fontSize: 13.5,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'color-mix(in srgb, var(--admin-surface) 92%, black)',
              }}
            >
              <Th width={120}>Date</Th>
              <Th>Titre</Th>
              {showFamily && <Th width={150}>Catégorie</Th>}
              <Th width={150}>Type</Th>
              {showIssuer && <Th width={180}>Émetteur</Th>}
              <Th width={120}>Source</Th>
              <Th width={260} align="right">
                Actions
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  borderTop: i > 0 ? '1px solid var(--admin-border)' : 'none',
                  background:
                    i % 2 === 0
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--admin-surface) 97%, black)',
                }}
              >
                <Td mono>{fmtDate(row.doc_date ?? row.discovered_at)}</Td>
                <Td>
                  <div
                    style={{
                      color: 'var(--admin-text)',
                      fontWeight: row.is_new ? 600 : 500,
                      lineHeight: 1.4,
                    }}
                  >
                    {row.title}
                  </div>
                </Td>
                {showFamily && (
                  <Td>
                    <FamilyBadge family={row.doc_family} />
                  </Td>
                )}
                <Td>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--admin-text-muted)',
                    }}
                  >
                    {subtypeLabel(row)}
                  </span>
                </Td>
                {showIssuer && (
                  <Td>
                    {row.issuer_slug ? (
                      <Link
                        href={`/admin/brvm/rapports/${row.issuer_slug}`}
                        style={{
                          color: 'var(--admin-text)',
                          textDecoration: 'none',
                          fontSize: 12.5,
                          borderBottom: '1px dotted color-mix(in srgb, var(--admin-text) 30%, transparent)',
                        }}
                      >
                        {row.issuer_name ?? row.issuer_slug}
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        —
                      </span>
                    )}
                  </Td>
                )}
                <Td>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    {row.source_name}
                  </span>
                </Td>
                <Td align="right">
                  <DocumentRowActions
                    documentId={row.id}
                    sourceUrl={row.source_url}
                    pdfUrl={row.pdf_url}
                    initialAiScore={row.ai_score ?? null}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  children,
  width,
  align = 'left',
}: {
  children: React.ReactNode
  width?: number
  align?: 'left' | 'right'
}) {
  return (
    <th
      style={{
        padding: '10px 20px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--admin-text-muted)',
        textAlign: align,
        width: width ? `${width}px` : undefined,
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  mono,
  align = 'left',
}: {
  children: React.ReactNode
  mono?: boolean
  align?: 'left' | 'right'
}) {
  return (
    <td
      style={{
        padding: '14px 20px',
        verticalAlign: 'middle',
        textAlign: align,
        fontFamily: mono ? 'var(--fm)' : undefined,
        fontSize: mono ? 12.5 : undefined,
        color: 'var(--admin-text)',
      }}
    >
      {children}
    </td>
  )
}

export function FamilyBadge({ family }: { family: DocFamily | null }) {
  if (!family) {
    return <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>—</span>
  }
  const themes: Record<DocFamily, { bg: string; fg: string; label: string }> = {
    market: { bg: '#e7f0fa', fg: '#1a4480', label: 'Marché' },
    report: { bg: '#e8f3ec', fg: '#1e5631', label: 'Rapport' },
    announcement: { bg: '#fdf2e3', fg: '#7a4a0c', label: 'Annonce' },
    publication: { bg: '#f4ecff', fg: '#4a2978', label: 'Publication' },
  }
  const t = themes[family]
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 68,
        padding: '3px 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 11,
        fontWeight: 600,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {t.label}
    </span>
  )
}
