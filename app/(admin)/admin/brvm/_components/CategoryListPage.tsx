import Link from 'next/link'
import { PageHeader } from './PageHeader'
import { DocumentsTable, type DocumentRow } from './DocumentsTable'
import { extractAiScore } from './extract-ai-score'
import { listDocuments } from '@/lib/brvm/documents'
import { DOC_FAMILY_LABELS, type DocFamily } from '@/lib/brvm/types'

type SubtypeNav = { key: string; label: string; href: string }

type Props = {
  family: DocFamily
  subtype?: string
  subtypeLabel?: string
  subtypeNav: SubtypeNav[]
  basePath: string
  title?: string
  subtitle?: string
  crumbLabel: string
  searchParams: Record<string, string | string[] | undefined>
}

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Page générique listing d'une catégorie (annonces / publications).
 * Utilisée par `/annonces/page.tsx`, `/annonces/[subtype]/page.tsx`,
 * `/publications/page.tsx`, `/publications/[subtype]/page.tsx`.
 */
export async function CategoryListPage({
  family,
  subtype,
  subtypeLabel,
  subtypeNav,
  basePath,
  title,
  subtitle,
  crumbLabel,
  searchParams,
}: Props) {
  const search = str(searchParams.search)
  const period = (str(searchParams.period) ?? '30d') as
    | 'today'
    | '7d'
    | '30d'
    | 'this_month'
    | 'all'

  const { rows, total } = await listDocuments({
    doc_family: family,
    doc_subtype: subtype,
    period,
    sort: 'doc_date_desc',
    search,
    limit: 100,
  }).catch(() => ({ rows: [], total: 0, period: { preset: period } }))

  const tableRows: DocumentRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    doc_date: r.doc_date,
    discovered_at: r.discovered_at,
    doc_type: r.doc_type,
    doc_family: r.doc_family,
    doc_subtype: r.doc_subtype,
    source_name: r.source_name,
    source_slug: r.source_slug,
    source_url: r.source_url,
    pdf_url: r.pdf_url,
    issuer_name: r.issuer_name,
    issuer_slug: r.issuer_slug,
    sector: r.sector,
    market_index: r.market_index,
    is_new: r.is_new,
    is_processed: r.is_processed,
    ai_score: extractAiScore(r.metadata),
  }))

  const resolvedTitle =
    title ?? (subtypeLabel ? subtypeLabel : `Toutes les ${crumbLabel.toLowerCase()}`)
  const resolvedSubtitle =
    subtitle ??
    (subtypeLabel
      ? `Flux chronologique des ${subtypeLabel.toLowerCase()}. Plus récent en haut, tri décroissant.`
      : `Toutes les publications ${family === 'announcement' ? 'd’annonces' : 'officielles'} de la BRVM, toutes catégories confondues.`)

  return (
    <>
      <PageHeader
        title={resolvedTitle}
        subtitle={resolvedSubtitle}
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { href: basePath, label: crumbLabel },
          ...(subtypeLabel ? [{ label: subtypeLabel }] : []),
        ]}
      />

      {/* Nav sous-catégories (chips horizontaux) */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 'var(--s5)',
          paddingBottom: 'var(--s4)',
          borderBottom: '1px solid var(--admin-border)',
        }}
      >
        {subtypeNav.map((n) => {
          const active = subtype ? n.key === subtype : n.key === 'all'
          return (
            <Link
              key={n.key}
              href={n.href}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: 'none',
                background: active
                  ? 'var(--admin-accent, #C5A028)'
                  : 'var(--admin-surface)',
                color: active ? '#0D1628' : 'var(--admin-text-muted)',
                border: `1px solid ${active ? 'var(--admin-accent, #C5A028)' : 'var(--admin-border)'}`,
              }}
            >
              {n.label}
            </Link>
          )
        })}
      </div>

      {/* Filtres période + recherche */}
      <form
        method="get"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s3) var(--s4)',
          marginBottom: 'var(--s4)',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: 12.5,
        }}
      >
        <select
          name="period"
          defaultValue={period}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            fontSize: 12.5,
            background: 'var(--admin-bg, #fff)',
            color: 'var(--admin-text)',
          }}
        >
          <option value="today">Aujourd’hui</option>
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="this_month">Mois en cours</option>
          <option value="all">Tout l’historique</option>
        </select>
        <input
          name="search"
          defaultValue={search ?? ''}
          placeholder="Titre, émetteur, description…"
          style={{
            flex: 1,
            minWidth: 220,
            padding: '6px 10px',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            fontSize: 12.5,
            background: 'var(--admin-bg, #fff)',
            color: 'var(--admin-text)',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '6px 14px',
            background: 'var(--admin-accent, #C5A028)',
            color: '#0D1628',
            border: 0,
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Appliquer
        </button>
        {(period !== '30d' || search) && (
          <Link
            href={basePath + (subtype ? `/${subtype}` : '')}
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted)',
              textDecoration: 'none',
            }}
          >
            Réinitialiser
          </Link>
        )}
      </form>

      <DocumentsTable
        rows={tableRows}
        total={total}
        showIssuer
        showFamily={!subtype}
        emptyMessage={
          subtype
            ? `Aucun document ${(subtypeLabel ?? subtype).toLowerCase()} sur cette période. Élargissez la période ou lancez la veille.`
            : `Aucun ${DOC_FAMILY_LABELS[family].toLowerCase()} sur cette période. Élargissez ou lancez la veille.`
        }
      />
    </>
  )
}
