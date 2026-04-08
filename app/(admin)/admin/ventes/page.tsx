import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatPriceFcfa } from '@/lib/ebooks/queries'

export default async function AdminVentesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, email, amount, status, payment_method, payment_ref, created_at, ebook:ebooks(title)')
    .order('created_at', { ascending: false })
    .limit(200)

  const totalPaid = (purchases ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount as number), 0)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff' }}>Ventes</h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Total encaissé
          </div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', color: '#C5A028', fontWeight: 600 }}>
            {formatPriceFcfa(totalPaid)}
          </div>
        </div>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Date</Th>
              <Th>Email</Th>
              <Th>Ebook</Th>
              <Th>Montant</Th>
              <Th>Méthode</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {(purchases ?? []).map((p) => (
              <tr key={p.id as string} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <Td>{new Date(p.created_at as string).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                <Td>{p.email}</Td>
                <Td>{(p.ebook as { title?: string } | null)?.title ?? '—'}</Td>
                <Td>{formatPriceFcfa(p.amount as number)}</Td>
                <Td>{p.payment_method ?? '—'}</Td>
                <Td>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600,
                    background:
                      p.status === 'paid' ? 'rgba(46,179,108,.15)' :
                      p.status === 'pending' ? 'rgba(255,200,0,.15)' :
                      'rgba(255,80,80,.15)',
                    color:
                      p.status === 'paid' ? '#5be58a' :
                      p.status === 'pending' ? '#ffd966' :
                      '#ff9b9b',
                  }}>
                    {p.status}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: 'left', padding: 'var(--s4) var(--s5)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{children}</th>
)
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: 'var(--s4) var(--s5)', fontSize: 'var(--text-sm)' }}>{children}</td>
)
