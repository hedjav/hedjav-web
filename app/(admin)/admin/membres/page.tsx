import { createSupabaseServerClient } from '@/lib/supabase/server'
import { promoteUserAction, demoteUserAction } from '@/lib/admin/setup'

export default async function AdminMembresPage() {
  const supabase = await createSupabaseServerClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, country, role, newsletter_opt, created_at')
    .order('created_at', { ascending: false })

  const { data: purchases } = await supabase
    .from('purchases')
    .select('email')
    .eq('status', 'paid')

  const purchaseCount = new Map<string, number>()
  for (const p of purchases ?? []) {
    purchaseCount.set(p.email as string, (purchaseCount.get(p.email as string) ?? 0) + 1)
  }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Membres ({profiles?.length ?? 0})
      </h1>

      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              <Th>Email</Th>
              <Th>Nom</Th>
              <Th>Pays</Th>
              <Th>Rôle</Th>
              <Th>Newsletter</Th>
              <Th>Achats</Th>
              <Th>Inscrit</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const isAdmin = p.role === 'admin'
              return (
                <tr key={p.id as string} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <Td>{p.email}</Td>
                  <Td>{p.full_name ?? '—'}</Td>
                  <Td>{p.country ?? '—'}</Td>
                  <Td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600,
                      background: isAdmin ? 'rgba(197,160,40,.15)' : 'rgba(255,255,255,.08)',
                      color: isAdmin ? '#C5A028' : 'rgba(255,255,255,.6)',
                    }}>
                      {p.role}
                    </span>
                  </Td>
                  <Td>{p.newsletter_opt ? '✓' : '—'}</Td>
                  <Td>{purchaseCount.get(p.email as string) ?? 0}</Td>
                  <Td>{new Date(p.created_at as string).toLocaleDateString('fr-FR')}</Td>
                  <Td>
                    {isAdmin ? (
                      <form action={demoteUserAction}>
                        <input type="hidden" name="user_id" value={p.id as string} />
                        <button type="submit" style={btnDanger}>Rétrograder</button>
                      </form>
                    ) : (
                      <form action={promoteUserAction}>
                        <input type="hidden" name="user_id" value={p.id as string} />
                        <button type="submit" style={btnGold}>Promouvoir admin</button>
                      </form>
                    )}
                  </Td>
                </tr>
              )
            })}
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

const btnGold = {
  padding: '4px 10px', background: 'transparent', color: '#C5A028',
  border: '1px solid rgba(197,160,40,.4)', borderRadius: 6,
  fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--fb)',
} as const
const btnDanger = {
  padding: '4px 10px', background: 'transparent', color: '#ff9b9b',
  border: '1px solid rgba(255,155,155,.3)', borderRadius: 6,
  fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--fb)',
} as const
