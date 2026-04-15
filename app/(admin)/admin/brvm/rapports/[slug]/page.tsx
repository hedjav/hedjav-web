import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '../../_components/PageHeader'
import { DocumentsTable, type DocumentRow } from '../../_components/DocumentsTable'
import { getEmetteurBySlug } from '@/lib/brvm/emetteurs'
import { listDocuments } from '@/lib/brvm/documents'
import { DOC_SUBTYPE_LABELS, DOC_SUBTYPES } from '@/lib/brvm/types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type RapportSubtype = 'all' | (typeof DOC_SUBTYPES.report)[number]

const REPORT_TABS: Array<{ key: RapportSubtype; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'rapport_annuel', label: 'Rapports annuels' },
  { key: 'etats_financiers', label: 'États financiers' },
  { key: 'rapport_semestriel', label: 'Rapports semestriels' },
  { key: 'rapport_trimestriel', label: 'Rapports trimestriels' },
  { key: 'commentaire_activite', label: "Commentaires d'activité" },
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const e = await getEmetteurBySlug(slug)
  return { title: `BRVM — ${e?.name ?? slug}` }
}

export default async function EmetteurDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: SearchParams
}) {
  const { slug } = await params
  const spRaw = await searchParams
  const tabRaw = typeof spRaw.type === 'string' ? spRaw.type : 'all'
  const tab = REPORT_TABS.find((t) => t.key === tabRaw)?.key ?? 'all'

  const emetteur = await getEmetteurBySlug(slug)
  if (!emetteur) notFound()

  const { rows, total } = await listDocuments({
    emetteur_id: emetteur.id,
    doc_family: 'report',
    doc_subtype: tab === 'all' ? undefined : tab,
    sort: 'doc_date_desc',
    limit: 100,
  }).catch(() => ({ rows: [], total: 0 }))

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
  }))

  // KPI par subtype
  const counts: Record<string, number> = {}
  for (const r of rows) {
    if (r.doc_subtype) counts[r.doc_subtype] = (counts[r.doc_subtype] ?? 0) + 1
  }

  return (
    <>
      <PageHeader
        title={emetteur.name}
        subtitle={emetteur.full_name ?? emetteur.name}
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { href: '/admin/brvm/rapports', label: 'Rapports cotées' },
          { label: emetteur.name },
        ]}
      />

      {/* Méta société */}
      <div
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s4) var(--s5)',
          marginBottom: 'var(--s5)',
          display: 'flex',
          gap: 'var(--s6)',
          flexWrap: 'wrap',
          fontSize: 13,
        }}
      >
        {emetteur.ticker && (
          <Meta label="Ticker" value={emetteur.ticker} mono />
        )}
        {emetteur.country && <Meta label="Pays" value={emetteur.country} />}
        {emetteur.sector && <Meta label="Secteur" value={emetteur.sector} />}
        {emetteur.market && <Meta label="Marché" value={emetteur.market} />}
        {emetteur.indices && emetteur.indices.length > 0 && (
          <Meta label="Indices" value={emetteur.indices.join(', ')} mono />
        )}
        <Meta label="Total documents" value={String(total)} mono />
      </div>

      {/* Tabs types de rapports */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 'var(--s5)',
          borderBottom: '1px solid var(--admin-border)',
          flexWrap: 'wrap',
        }}
      >
        {REPORT_TABS.map((t) => {
          const active = tab === t.key
          const count = t.key === 'all' ? total : counts[t.key] ?? 0
          return (
            <Link
              key={t.key}
              href={
                t.key === 'all'
                  ? `/admin/brvm/rapports/${slug}`
                  : `/admin/brvm/rapports/${slug}?type=${t.key}`
              }
              role="tab"
              aria-selected={active}
              style={{
                padding: '11px 16px',
                textDecoration: 'none',
                borderBottom: active
                  ? '2px solid var(--admin-accent, #C5A028)'
                  : '2px solid transparent',
                color: active
                  ? 'var(--admin-accent, #C5A028)'
                  : 'var(--admin-text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: 13.5,
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {t.label}
              <span
                style={{
                  background: 'color-mix(in srgb, var(--admin-text) 7%, transparent)',
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontFamily: 'var(--fm)',
                  color: active ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text-muted)',
                }}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      <DocumentsTable
        rows={tableRows}
        total={total}
        showIssuer={false}
        emptyMessage={
          tab === 'all'
            ? `Aucun rapport indexé pour ${emetteur.name}. Les documents apparaîtront ici après exécution de la veille rapports.`
            : `Aucun ${(DOC_SUBTYPE_LABELS[tab as keyof typeof DOC_SUBTYPE_LABELS] ?? tab).toLowerCase()} pour ${emetteur.name} à ce jour.`
        }
      />
    </>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--admin-text-muted)',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: 'var(--admin-text)',
          fontFamily: mono ? 'var(--fm)' : 'var(--fb)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  )
}
