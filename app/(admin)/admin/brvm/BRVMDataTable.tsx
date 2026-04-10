'use client'

import { useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'

type BrvmRow = {
  id: string
  data_date: string
  data_type: string
  title: string | null
  source_url: string | null
  file_url: string | null
  ai_summary: string | null
}

const TYPE_LABELS: Record<string, string> = {
  resume_seance: 'Résumé séance',
  cours_actions: 'Cours actions',
  indices: 'Indices',
  boc_quotidien: 'BOC PDF',
  annonce_ag: 'Annonce AG',
  annonce_communique: 'Communiqué',
  annonce_esv: 'Événement valeur',
  annonce_notation: 'Notation',
  annonce_resolution: 'Résolution',
  annonce_dirigeant: 'Dirigeant',
  annonce_seuil: 'Seuil',
  rapport_societe: 'Rapport société',
  bulletin_mensuel: 'Bulletin mensuel',
  avis_publication: 'Avis',
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  resume_seance: { bg: 'rgba(59,130,246,.15)', text: '#3B82F6' },
  cours_actions: { bg: 'rgba(197,160,40,.15)', text: '#C5A028' },
  indices: { bg: 'rgba(34,197,94,.15)', text: '#22C55E' },
  boc_quotidien: { bg: 'rgba(168,85,247,.15)', text: '#A855F7' },
  rapport_societe: { bg: 'rgba(59,130,246,.15)', text: '#3B82F6' },
}

export function BRVMDataTable({ data }: { data: BrvmRow[] }) {
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const types = [...new Set(data.map((d) => d.data_type))].sort()
  const filtered = typeFilter === 'all' ? data : data.filter((d) => d.data_type === typeFilter)

  const columns: Column<BrvmRow>[] = [
    {
      key: 'data_date',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
          {row.data_date}
        </span>
      ),
    },
    {
      key: 'data_type',
      label: 'Type',
      sortable: true,
      render: (row) => {
        const c = TYPE_COLORS[row.data_type] ?? { bg: 'rgba(255,255,255,.06)', text: 'var(--admin-text-muted)' }
        return (
          <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>
            {TYPE_LABELS[row.data_type] ?? row.data_type}
          </span>
        )
      },
    },
    {
      key: 'title',
      label: 'Titre',
      sortable: true,
      render: (row) => (
        <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {row.title ?? '—'}
        </span>
      ),
    },
    {
      key: 'source_url',
      label: 'Source',
      render: (row) => row.source_url ? (
        <a href={row.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 12 }}>
          Voir source
        </a>
      ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {row.file_url && (
            <a
              href={row.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'var(--admin-accent)', color: '#fff', textDecoration: 'none',
              }}
            >
              Télécharger PDF
            </a>
          )}
          {row.ai_summary && (
            <span
              title={row.ai_summary}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgba(34,197,94,.15)', color: '#22C55E', cursor: 'help',
              }}
            >
              Résumé IA
            </span>
          )}
          {!row.file_url && !row.ai_summary && (
            <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>Données</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Filtre par type */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Filtrer par type :</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 13,
            background: 'var(--admin-surface)', color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <option value="all">Tous les types ({data.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t} ({data.filter((d) => d.data_type === t).length})
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        searchKeys={['title', 'data_type', 'data_date']}
        pageSize={20}
        emptyMessage="Aucune donnée BRVM. Lancez une veille pour commencer."
      />
    </div>
  )
}
