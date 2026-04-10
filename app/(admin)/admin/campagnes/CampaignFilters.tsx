'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CampaignStatusButton } from './CampaignStatusButton'
import { CampaignDeleteButton } from './CampaignDeleteButton'

type Row = {
  id: string
  name: string
  type: string
  status: string
  emails: number
  sent: number
  openRate: number
  clickRate: number
}

export function CampaignFilters({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(() => {
    let result = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (typeFilter) {
      result = result.filter((r) => r.type === typeFilter)
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter)
    }
    return result
  }, [rows, search, typeFilter, statusFilter])

  const selectStyle = {
    padding: '8px 14px',
    background: 'var(--admin-surface)',
    border: '1px solid var(--admin-border)',
    borderRadius: 8,
    color: 'var(--admin-text)',
    fontSize: 13,
    fontFamily: 'var(--fb)',
  }

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom..."
          style={{
            ...selectStyle,
            width: '100%',
            maxWidth: 280,
          }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">Tous les types</option>
          <option value="welcome_sequence">Bienvenue</option>
          <option value="promo">Promotion</option>
          <option value="weekly">Hebdomadaire</option>
          <option value="custom">Personnalise</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="active">Active</option>
          <option value="paused">Pause</option>
          <option value="completed">Terminee</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
          {filtered.length} resultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Nom', 'Type', 'Statut', 'Emails', 'Envoyes', 'Ouverture', 'Clics', 'Actions'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 600 }}>
                  <Link href={`/admin/campagnes/${c.id}`} style={{ color: 'var(--admin-text)' }}>{c.name}</Link>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12 }}>{c.type}</td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: c.status === 'active' ? 'rgba(34,197,94,.15)' : c.status === 'paused' ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.06)',
                    color: c.status === 'active' ? 'var(--admin-success)' : c.status === 'paused' ? 'var(--admin-warning)' : 'var(--admin-text-muted)',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{c.emails}</td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{c.sent}</td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{c.openRate}%</td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{c.clickRate}%</td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <CampaignStatusButton id={c.id} currentStatus={c.status} />
                    <CampaignDeleteButton id={c.id} name={c.name} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucune campagne</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
