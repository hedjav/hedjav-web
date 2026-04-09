'use client'

import { useState, useMemo } from 'react'

export type Column<T> = {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  searchKeys?: string[]
  emptyMessage?: string
}

function getNestedValue(obj: unknown, key: string): unknown {
  const parts = key.split('.')
  let val: unknown = obj
  for (const p of parts) {
    if (val == null || typeof val !== 'object') return undefined
    val = (val as Record<string, unknown>)[p]
  }
  return val
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 20,
  searchKeys = [],
  emptyMessage = 'Aucune donnee',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = data
    if (search.trim() && searchKeys.length > 0) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        searchKeys.some((k) => {
          const v = getNestedValue(row, k)
          return v != null && String(v).toLowerCase().includes(q)
        }),
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = getNestedValue(a, sortKey)
        const bVal = getNestedValue(b, sortKey)
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortAsc ? aVal - bVal : bVal - aVal
        }
        const cmp = String(aVal).localeCompare(String(bVal), 'fr')
        return sortAsc ? cmp : -cmp
      })
    }
    return result
  }, [data, search, searchKeys, sortKey, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
    setPage(1)
  }

  return (
    <div>
      {/* Top bar: search + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        {searchKeys.length > 0 && (
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher..."
            style={{
              width: '100%',
              maxWidth: 320,
              padding: '8px 14px',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 8,
              color: 'var(--admin-text)',
              fontSize: 13,
              fontFamily: 'var(--fb)',
            }}
          />
        )}
        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} resultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,.2)' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.1em',
                      color: 'var(--admin-text-muted)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: col.sortable ? 'none' : undefined,
                      position: 'sticky',
                      top: 0,
                      background: 'var(--admin-surface)',
                    }}
                  >
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ marginLeft: 4 }}>{sortAsc ? '\u2191' : '\u2193'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,.04)',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: '10px 16px', fontSize: 13 }}>
                        {col.render
                          ? col.render(row)
                          : String(getNestedValue(row, col.key) ?? '\u2014')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            style={{
              padding: '6px 12px',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 6,
              color: safePage <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text)',
              fontSize: 12,
              cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--fb)',
            }}
          >
            Precedent
          </button>
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            style={{
              padding: '6px 12px',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 6,
              color: safePage >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text)',
              fontSize: 12,
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--fb)',
            }}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
