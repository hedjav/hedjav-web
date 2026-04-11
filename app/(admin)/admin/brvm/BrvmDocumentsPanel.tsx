'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/admin/DataTable'

type DocumentRow = {
  id: string
  doc_type: string
  doc_type_label: string
  doc_date: string | null
  title: string
  source_name: string
  source_url: string
  pdf_url: string | null
  issuer_name: string | null
  is_new: boolean
  is_processed: boolean
  discovered_at: string
}

type Tab = 'all' | 'new' | 'boc' | 'rapports' | 'annonces' | 'communiques'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'new', label: 'Nouveautés' },
  { id: 'boc', label: 'BOC' },
  { id: 'rapports', label: 'Rapports' },
  { id: 'annonces', label: 'Annonces' },
  { id: 'communiques', label: 'Communiqués' },
]

function matchesTab(row: DocumentRow, tab: Tab): boolean {
  switch (tab) {
    case 'all':
      return true
    case 'new':
      return row.is_new
    case 'boc':
      return row.doc_type === 'boc'
    case 'rapports':
      return row.doc_type.startsWith('rapport_')
    case 'annonces':
      return row.doc_type === 'annonce'
    case 'communiques':
      return row.doc_type === 'communique' || row.doc_type === 'note_information'
  }
}

export function BrvmDocumentsPanel({ initialDocs }: { initialDocs: DocumentRow[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const filtered = useMemo(() => initialDocs.filter((d) => matchesTab(d, activeTab)), [
    initialDocs,
    activeTab,
  ])

  const tabCounts: Record<Tab, number> = useMemo(
    () => ({
      all: initialDocs.length,
      new: initialDocs.filter((d) => matchesTab(d, 'new')).length,
      boc: initialDocs.filter((d) => matchesTab(d, 'boc')).length,
      rapports: initialDocs.filter((d) => matchesTab(d, 'rapports')).length,
      annonces: initialDocs.filter((d) => matchesTab(d, 'annonces')).length,
      communiques: initialDocs.filter((d) => matchesTab(d, 'communiques')).length,
    }),
    [initialDocs]
  )

  async function markProcessed(id: string) {
    setProcessingId(id)
    try {
      await fetch(`/api/brvm/documents/${id}/process`, { method: 'POST' })
      // Refresh visuel : on recharge la page (force-dynamic)
      window.location.reload()
    } catch {
      setProcessingId(null)
    }
  }

  const columns: Column<DocumentRow & Record<string, unknown>>[] = [
    {
      key: 'doc_type_label',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            background:
              row.doc_type === 'boc'
                ? 'rgba(197, 160, 40, 0.18)'
                : row.doc_type.startsWith('rapport_')
                  ? 'rgba(74, 144, 217, 0.15)'
                  : 'rgba(139, 224, 122, 0.12)',
            color:
              row.doc_type === 'boc'
                ? 'var(--admin-accent, #C5A028)'
                : row.doc_type.startsWith('rapport_')
                  ? 'var(--admin-info, #4A90D9)'
                  : '#8BE07A',
          }}
        >
          {row.doc_type_label}
        </span>
      ),
    },
    {
      key: 'doc_date',
      label: 'Date doc',
      sortable: true,
      render: (row) =>
        row.doc_date ? (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--admin-text, #E7ECF5)' }}>
            {row.doc_date}
          </span>
        ) : (
          <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
        ),
    },
    {
      key: 'title',
      label: 'Titre',
      sortable: true,
      render: (row) => (
        <div style={{ maxWidth: 420 }}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--admin-text, #E7ECF5)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.title}
          >
            {row.title}
          </div>
          {row.issuer_name && (
            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
              {row.issuer_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source_name',
      label: 'Source',
      render: (row) => (
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{row.source_name}</span>
      ),
    },
    {
      key: 'is_new',
      label: 'Statut',
      render: (row) => {
        if (row.is_processed) {
          return (
            <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>✓ Traité</span>
          )
        }
        if (row.is_new) {
          return (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(197, 160, 40, 0.2)',
                color: 'var(--admin-accent, #C5A028)',
                textTransform: 'uppercase',
              }}
            >
              Nouveau
            </span>
          )
        }
        return <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>—</span>
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {row.pdf_url && (
            <a
              href={row.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'rgba(197, 160, 40, 0.15)',
                color: 'var(--admin-accent, #C5A028)',
                textDecoration: 'none',
                borderRadius: 6,
                border: '1px solid rgba(197, 160, 40, 0.3)',
                fontWeight: 600,
              }}
            >
              PDF ↗
            </a>
          )}
          {!row.is_processed && (
            <button
              onClick={() => markProcessed(row.id)}
              disabled={processingId === row.id}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'transparent',
                color: 'var(--admin-text-muted)',
                border: '1px solid var(--admin-border)',
                borderRadius: 6,
                cursor: processingId === row.id ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {processingId === row.id ? '...' : 'Traiter'}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 'var(--s5)',
          borderBottom: '1px solid var(--admin-border)',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--admin-accent, #C5A028)'
                  : '2px solid transparent',
                color: isActive ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text-muted)',
                fontFamily: 'var(--fb)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: -1,
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: isActive
                    ? 'rgba(197, 160, 40, 0.2)'
                    : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? 'var(--admin-accent, #C5A028)' : 'var(--admin-text-muted)',
                }}
              >
                {tabCounts[tab.id]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <DataTable
        data={filtered as (DocumentRow & Record<string, unknown>)[]}
        columns={columns}
        pageSize={20}
        searchKeys={['title', 'issuer_name', 'doc_type_label', 'source_name']}
        emptyMessage={
          activeTab === 'all'
            ? 'Aucun document BRVM indexé. Clique sur "Lancer la veille" pour démarrer.'
            : `Aucun document dans l'onglet « ${TABS.find((t) => t.id === activeTab)?.label} »`
        }
      />
    </div>
  )
}
