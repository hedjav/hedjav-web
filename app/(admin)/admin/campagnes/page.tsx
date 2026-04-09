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
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>Campagnes</h1>
        <Link
          href="/admin/campagnes/new"
          style={{ background: 'var(--admin-accent)', color: '#0F1117', padding: 'var(--s3) var(--s5)', borderRadius: 'var(--r8)', fontFamily: 'var(--fb)', fontSize: 'var(--text-sm)', fontWeight: 600, textDecoration: 'none' }}
        >
          + Nouvelle campagne
        </Link>
      </div>

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
            {campaigns.map((c) => {
              const s = statsMap[c.id]
              const openRate = s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0
              const clickRate = s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0
              return (
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
              <tr><td colSpan={8} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucune campagne</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
