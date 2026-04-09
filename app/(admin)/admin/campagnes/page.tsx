import Link from 'next/link'
import { getAllCampaigns, getCampaignStats } from '@/lib/campaigns/queries'
import { CampaignStatusButton } from './CampaignStatusButton'

export default async function AdminCampaignsPage() {
  const campaigns = await getAllCampaigns()
  const statsMap: Record<string, Awaited<ReturnType<typeof getCampaignStats>>> = {}
  for (const c of campaigns) {
    statsMap[c.id] = await getCampaignStats(c.id)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff' }}>Campagnes</h1>
        <Link
          href="/admin/campagnes/new"
          style={{ background: '#C5A028', color: '#fff', padding: 'var(--s3) var(--s5)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          + Nouvelle campagne
        </Link>
      </div>

      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Nom', 'Type', 'Statut', 'Emails', 'Envoyés', 'Ouverture', 'Clics', 'Actions'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: '#C5A028', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const s = statsMap[c.id]
              const openRate = s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0
              const clickRate = s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0
              return (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 600 }}>
                    <Link href={`/admin/campagnes/${c.id}`} style={{ color: '#E0E6EF' }}>{c.name}</Link>
                  </td>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 'var(--text-xs)' }}>{c.type}</td>
                  <td style={{ padding: 'var(--s3) var(--s4)' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                      background: c.status === 'active' ? 'rgba(46,179,108,.2)' : c.status === 'paused' ? 'rgba(255,190,0,.2)' : 'rgba(255,255,255,.08)',
                      color: c.status === 'active' ? '#4ade80' : c.status === 'paused' ? '#fbbf24' : '#E0E6EF',
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{s.emails}</td>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{s.sent}</td>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{openRate}%</td>
                  <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{clickRate}%</td>
                  <td style={{ padding: 'var(--s3) var(--s4)' }}>
                    <CampaignStatusButton id={c.id} currentStatus={c.status} />
                  </td>
                </tr>
              )
            })}
            {campaigns.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Aucune campagne</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
