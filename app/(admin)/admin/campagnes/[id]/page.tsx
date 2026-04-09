import { notFound } from 'next/navigation'
import { getCampaignById, getCampaignEmails, getCampaignStats, getSubscribersForCampaign, getSubscriberScore } from '@/lib/campaigns/queries'
import { CampaignStatusButton } from '../CampaignStatusButton'
import { AddEmailForm } from './AddEmailForm'
import { GenerateButton } from './GenerateButton'

type Props = { params: Promise<{ id: string }> }

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params
  const campaign = await getCampaignById(id)
  if (!campaign) notFound()

  const [emails, stats, subscribers] = await Promise.all([
    getCampaignEmails(id),
    getCampaignStats(id),
    getSubscribersForCampaign(campaign),
  ])

  // Score des abonnés
  const scoredSubs = await Promise.all(
    subscribers.slice(0, 50).map(async (s) => ({
      ...s,
      ...(await getSubscriberScore(s.email)),
    })),
  )

  const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0
  const clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0

  const statBoxStyle = { background: '#1B2A4A', borderRadius: 'var(--r12)', padding: 'var(--s4) var(--s5)', textAlign: 'center' as const }
  const statValueStyle = { fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#fff' }
  const statLabelStyle = { fontSize: 'var(--text-xs)', color: '#C5A028', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginTop: '4px' }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s6)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff' }}>{campaign.name}</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,.4)', marginTop: '4px' }}>{campaign.type} · tags: {(campaign.target_tags ?? []).join(', ') || 'tous'}</p>
        </div>
        <CampaignStatusButton id={id} currentStatus={campaign.status} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s8)' }}>
        <div style={statBoxStyle}><div style={statValueStyle}>{stats.emails}</div><div style={statLabelStyle}>Emails</div></div>
        <div style={statBoxStyle}><div style={statValueStyle}>{stats.sent}</div><div style={statLabelStyle}>Envoyés</div></div>
        <div style={statBoxStyle}><div style={statValueStyle}>{openRate}%</div><div style={statLabelStyle}>Ouverture</div></div>
        <div style={statBoxStyle}><div style={statValueStyle}>{clickRate}%</div><div style={statLabelStyle}>Clics</div></div>
      </div>

      {/* Séquence emails */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-2xl)', color: '#fff', marginBottom: 'var(--s4)' }}>Séquence d&apos;emails</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', marginBottom: 'var(--s8)' }}>
        {emails.map((e) => (
          <div key={e.id} style={{ background: '#1B2A4A', borderRadius: 'var(--r12)', padding: 'var(--s4) var(--s5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s4)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <span style={{ background: '#C5A028', color: '#fff', borderRadius: '9999px', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {e.position}
                </span>
                <strong style={{ color: '#E0E6EF' }}>{e.subject}</strong>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.4)', marginTop: '4px' }}>
                J+{e.delay_days} · {e.body_html ? 'HTML prêt' : 'Pas de contenu'}
              </div>
            </div>
            <GenerateButton campaignId={id} position={e.position} hasContent={Boolean(e.body_html)} />
          </div>
        ))}
        {emails.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,.4)', fontStyle: 'italic' }}>Aucun email dans la séquence</p>
        )}
      </div>

      {/* Ajouter un email */}
      <AddEmailForm campaignId={id} nextPosition={emails.length + 1} />

      {/* Abonnés */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-2xl)', color: '#fff', margin: 'var(--s8) 0 var(--s4)' }}>
        Abonnés ({subscribers.length})
      </h2>
      <div style={{ background: '#1B2A4A', borderRadius: 'var(--r16)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#E0E6EF' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Email', 'Step', 'Dernier envoi', 'Score'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: '#C5A028', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoredSubs.map((s) => (
              <tr key={s.email} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 'var(--text-sm)' }}>{s.email}</td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--fm)' }}>{s.campaign_step}/{emails.length}</td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,.4)' }}>
                  {s.last_email_sent_at ? new Date(s.last_email_sent_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                    background: s.level === 'chaud' ? 'rgba(255,80,80,.2)' : s.level === 'tiede' ? 'rgba(255,190,0,.2)' : 'rgba(255,255,255,.08)',
                    color: s.level === 'chaud' ? '#ff6b6b' : s.level === 'tiede' ? '#fbbf24' : 'rgba(255,255,255,.5)',
                  }}>
                    {s.level} ({s.score})
                  </span>
                </td>
              </tr>
            ))}
            {scoredSubs.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 'var(--s6)', textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>Aucun abonné</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
