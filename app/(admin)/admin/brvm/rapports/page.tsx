import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '../_components/PageHeader'
import { EmptyState } from '../_components/EmptyState'
import { getEmetteurFacets, listEmetteurs } from '@/lib/brvm/emetteurs'

export const metadata: Metadata = { title: 'BRVM — Rapports sociétés cotées' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export default async function RapportsListPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const sector = str(params.sector)
  const index = str(params.index)
  const search = str(params.search)

  const [list, facets] = await Promise.all([
    listEmetteurs({
      sector,
      index,
      search,
      limit: 200,
      active_only: true,
    }).catch(() => ({ rows: [], total: 0 })),
    getEmetteurFacets().catch(() => ({ sectors: [], indices: [], countries: [] })),
  ])

  return (
    <>
      <PageHeader
        title="Rapports sociétés cotées"
        subtitle="Sélectionnez une société pour consulter ses rapports annuels, semestriels, trimestriels, états financiers et commentaires d'activité. Classement strict : société → type → documents."
        crumbs={[
          { href: '/admin/brvm', label: 'Centre BRVM' },
          { label: 'Rapports cotées' },
        ]}
      />

      {/* Filtres */}
      <form
        method="get"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          padding: 'var(--s4) var(--s5)',
          marginBottom: 'var(--s5)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label
            htmlFor="brvm-rapports-search"
            style={{
              display: 'block',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--admin-text-muted)',
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Recherche
          </label>
          <input
            id="brvm-rapports-search"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Société, ticker, nom complet…"
            style={{
              width: 280,
              padding: '8px 12px',
              background: 'var(--admin-bg, #fff)',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--admin-text)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="brvm-rapports-sector"
            style={{
              display: 'block',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--admin-text-muted)',
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Secteur
          </label>
          <select
            id="brvm-rapports-sector"
            name="sector"
            defaultValue={sector ?? ''}
            style={{
              padding: '8px 12px',
              background: 'var(--admin-bg, #fff)',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--admin-text)',
              minWidth: 180,
            }}
          >
            <option value="">Tous les secteurs</option>
            {facets.sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="brvm-rapports-index"
            style={{
              display: 'block',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--admin-text-muted)',
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Indice
          </label>
          <select
            id="brvm-rapports-index"
            name="index"
            defaultValue={index ?? ''}
            style={{
              padding: '8px 12px',
              background: 'var(--admin-bg, #fff)',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--admin-text)',
              minWidth: 160,
            }}
          >
            <option value="">Tous les indices</option>
            {facets.indices.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: 'var(--admin-accent, #C5A028)',
            color: '#0D1628',
            fontWeight: 600,
            fontSize: 13,
            border: 0,
            cursor: 'pointer',
          }}
        >
          Appliquer
        </button>
        {(sector || index || search) && (
          <Link
            href="/admin/brvm/rapports"
            style={{
              fontSize: 12.5,
              color: 'var(--admin-text-muted)',
              textDecoration: 'none',
            }}
          >
            Effacer
          </Link>
        )}
      </form>

      <p
        style={{
          fontSize: 12.5,
          color: 'var(--admin-text-muted)',
          marginBottom: 'var(--s4)',
        }}
      >
        <strong style={{ color: 'var(--admin-text)' }}>{list.total}</strong> sociétés cotées
      </p>

      {list.rows.length === 0 ? (
        <EmptyState
          title="Aucune société"
          message="Le référentiel brvm_emetteurs est vide pour ces filtres. Lancez le scraping émetteurs pour le peupler."
          cta={{ href: '/admin/brvm', label: 'Retour au Centre BRVM' }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--s3)',
          }}
        >
          {list.rows.map((e) => (
            <Link
              key={e.id}
              href={`/admin/brvm/rapports/${e.slug}`}
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                borderRadius: 12,
                padding: 'var(--s4)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 140,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--fd)',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--admin-text)',
                      lineHeight: 1.2,
                    }}
                  >
                    {e.name}
                  </p>
                  {e.ticker && (
                    <p
                      style={{
                        fontFamily: 'var(--fm)',
                        fontSize: 11,
                        color: 'var(--admin-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {e.ticker}
                      {e.country ? ` · ${e.country}` : ''}
                    </p>
                  )}
                </div>
                {e.sector && (
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'color-mix(in srgb, var(--admin-accent, #C5A028) 15%, transparent)',
                      color: 'var(--admin-text)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.sector}
                  </span>
                )}
              </div>
              {e.indices && e.indices.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {e.indices.map((i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'color-mix(in srgb, var(--admin-text) 6%, transparent)',
                        color: 'var(--admin-text-muted)',
                        fontFamily: 'var(--fm)',
                      }}
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--admin-text-muted)',
                  marginTop: 'auto',
                }}
              >
                Voir rapports →
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
