import Link from 'next/link'
import { getAllCampaigns, getCampaignStats } from '@/lib/campaigns/queries'
import { CampaignStatusButton } from './CampaignStatusButton'
import { CampaignDeleteButton } from './CampaignDeleteButton'
import { CampaignFilters } from './CampaignFilters'

export default async function AdminCampaignsPage() {
  const campaigns = await getAllCampaigns()
  const statsMap: Record<string, Awaited<ReturnType<typeof getCampaignStats>>> = {}
  for (const c of campaigns) {
    statsMap[c.id] = await getCampaignStats(c.id)
  }

  const rows = campaigns.map((c) => {
    const s = statsMap[c.id]
    const openRate = s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0
    const clickRate = s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      emails: s.emails,
      sent: s.sent,
      openRate,
      clickRate,
    }
  })

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

      <CampaignFilters rows={rows} />
    </>
  )
}
