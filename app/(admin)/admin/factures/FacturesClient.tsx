'use client'

import { useState, useMemo } from 'react'

type Invoice = {
  id: string
  invoice_number: string
  user_email: string
  user_name: string | null
  ebook_title: string
  amount: number
  currency: string
  status: string
  pdf_url: string | null
  created_at: string
}

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export function FacturesClient({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.user_email.toLowerCase().includes(q) ||
        (i.user_name ?? '').toLowerCase().includes(q),
    )
  }, [invoices, search])

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: 'var(--s5)' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par numero ou email..."
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '10px 14px',
            background: '#1B2A4A',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 8,
            color: '#E0E6EF',
            fontSize: 13,
            fontFamily: 'var(--fb)',
          }}
        />
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>N. facture</Th>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Ebook</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
              <Th>PDF</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
                  Aucune facture
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <Td>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: '#C5A028' }}>
                      {inv.invoice_number}
                    </span>
                  </Td>
                  <Td>{new Date(inv.created_at).toLocaleDateString('fr-FR')}</Td>
                  <Td>
                    <div style={{ fontSize: 13 }}>{inv.user_name ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{inv.user_email}</div>
                  </Td>
                  <Td>{inv.ebook_title}</Td>
                  <Td style={{ fontFamily: 'var(--fm)' }}>{formatFcfa(inv.amount)}</Td>
                  <Td>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        inv.status === 'paid' ? 'rgba(46,179,108,.15)' :
                        inv.status === 'refunded' ? 'rgba(255,200,0,.15)' :
                        'rgba(255,80,80,.15)',
                      color:
                        inv.status === 'paid' ? '#5be58a' :
                        inv.status === 'refunded' ? '#ffd966' :
                        '#ff9b9b',
                    }}>
                      {inv.status}
                    </span>
                  </Td>
                  <Td>
                    {inv.pdf_url ? (
                      <a
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(197,160,40,.15)',
                          color: '#C5A028',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Telecharger
                      </a>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>—</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: 'left', padding: 'var(--s4) var(--s5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: 'var(--s4) var(--s5)', fontSize: 13, ...style }}>
      {children}
    </td>
  )
}
