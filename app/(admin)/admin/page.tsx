import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SparklineChart } from '@/components/admin/SparklineChart'
import { RevenueChart } from '@/components/admin/RevenueChart'

export const metadata: Metadata = { title: 'Admin — Dashboard' }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

async function getDashboardData() {
  const supabase = db()
  const now = new Date()
  const thisMonth = startOfMonth(now)
  const lastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  // Revenue data — all paid purchases
  const { data: allPurchases } = await supabase
    .from('purchases')
    .select('amount, created_at, email, status')
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

  // Profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: true })

  // Newsletter subscribers
  const { data: allSubs } = await supabase
    .from('newsletter_subscribers')
    .select('email, is_active, subscribed_at')
    .eq('is_active', true)
    .order('subscribed_at', { ascending: true })

  const purchases = allPurchases ?? []
  const profiles = allProfiles ?? []
  const subs = allSubs ?? []

  // Monthly revenue for 12 months
  const revenueByMonth: Record<string, number> = {}
  const membersPerMonth: Record<string, number> = {}
  const salesPerMonth: Record<string, number> = {}
  const subsPerMonth: Record<string, number> = {}

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth[key] = 0
    membersPerMonth[key] = 0
    salesPerMonth[key] = 0
    subsPerMonth[key] = 0
  }

  for (const p of purchases) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in revenueByMonth) {
      revenueByMonth[key] += p.amount
      salesPerMonth[key] += 1
    }
  }

  for (const p of profiles) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in membersPerMonth) membersPerMonth[key] += 1
  }

  for (const s of subs) {
    const d = new Date(s.subscribed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in subsPerMonth) subsPerMonth[key] += 1
  }

  const months = Object.keys(revenueByMonth).sort()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

  function pctChange(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  // Revenue chart data
  const chartData = months.map((key) => {
    const [y, m] = key.split('-')
    const d = new Date(Number(y), Number(m) - 1, 1)
    return { month: monthLabel(d), revenue: revenueByMonth[key] }
  })

  // Sparklines: last 6 months
  const last6 = months.slice(-6)
  const revenueSparkline = last6.map((k) => ({ value: revenueByMonth[k] }))
  const membersSparkline = last6.map((k) => ({ value: membersPerMonth[k] }))
  const salesSparkline = last6.map((k) => ({ value: salesPerMonth[k] }))
  const subsSparkline = last6.map((k) => ({ value: subsPerMonth[k] }))

  // Revenue total this month
  const revenueThisMonth = revenueByMonth[thisKey] ?? 0
  const revenueLastMonth = revenueByMonth[lastKey] ?? 0

  // Sales this month
  const salesThisMonth = salesPerMonth[thisKey] ?? 0
  const salesLastMonth = salesPerMonth[lastKey] ?? 0

  // Members total
  const membersTotal = profiles.length
  const membersThisMonth = membersPerMonth[thisKey] ?? 0
  const membersLastMonthCount = membersPerMonth[lastKey] ?? 0

  // Newsletter
  const subsTotal = subs.length
  const subsThisMonth = subsPerMonth[thisKey] ?? 0
  const subsLastMonth = subsPerMonth[lastKey] ?? 0

  return {
    cards: [
      {
        label: 'Revenue',
        value: `${revenueThisMonth.toLocaleString('fr-FR')} F`,
        change: pctChange(revenueThisMonth, revenueLastMonth),
        sparkline: revenueSparkline,
      },
      {
        label: 'Membres',
        value: String(membersTotal),
        change: pctChange(membersThisMonth, membersLastMonthCount),
        sparkline: membersSparkline,
      },
      {
        label: 'Ventes ce mois',
        value: String(salesThisMonth),
        change: pctChange(salesThisMonth, salesLastMonth),
        sparkline: salesSparkline,
      },
      {
        label: 'Abonnés newsletter',
        value: String(subsTotal),
        change: pctChange(subsThisMonth, subsLastMonth),
        sparkline: subsSparkline,
      },
    ],
    chartData,
    recentActivity: await getRecentActivity(supabase),
    campaigns: await getCampaignStats(supabase),
  }
}

type SupaClient = ReturnType<typeof db>

async function getRecentActivity(supabase: SupaClient) {
  const [{ data: recentPurchases }, { data: recentProfiles }, { data: recentSubs }] =
    await Promise.all([
      supabase
        .from('purchases')
        .select('email, created_at, status, ebook:ebooks(title)')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('newsletter_subscribers')
        .select('email, subscribed_at')
        .eq('is_active', true)
        .order('subscribed_at', { ascending: false })
        .limit(10),
    ])

  type Activity = { type: 'purchase' | 'member' | 'newsletter'; text: string; date: string }

  const activities: Activity[] = []

  for (const p of recentPurchases ?? []) {
    const ebookTitle = (p.ebook as { title?: string } | null)?.title ?? 'un ebook'
    activities.push({
      type: 'purchase',
      text: `Nouvel achat de ${ebookTitle} par ${p.email}`,
      date: p.created_at,
    })
  }
  for (const p of recentProfiles ?? []) {
    activities.push({
      type: 'member',
      text: `Nouveau membre : ${p.full_name ?? p.email}`,
      date: p.created_at,
    })
  }
  for (const s of recentSubs ?? []) {
    activities.push({
      type: 'newsletter',
      text: `Nouvel abonné newsletter : ${s.email}`,
      date: s.subscribed_at,
    })
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return activities.slice(0, 10)
}

async function getCampaignStats(supabase: SupaClient) {
  const [{ count: activeCampaigns }, { data: sends }] = await Promise.all([
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('campaign_sends').select('status').in('status', ['sent', 'opened', 'clicked']),
  ])

  const all = sends ?? []
  const opened = all.filter((s) => s.status === 'opened' || s.status === 'clicked').length
  const avgOpen = all.length > 0 ? Math.round((opened / all.length) * 100) : 0

  return { active: activeCampaigns ?? 0, avgOpen }
}

function relativeTime(dateStr: string) {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export default async function AdminDashboard() {
  const data = await getDashboardData()

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 32,
        }}
      >
        Dashboard
      </h1>

      {/* Stats cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {data.cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 16,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--admin-text-muted)',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {card.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--admin-text)',
                }}
              >
                {card.value}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: card.change >= 0 ? 'var(--admin-success)' : '#ff9b9b',
                }}
              >
                {card.change >= 0 ? '+' : ''}{card.change}%
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <SparklineChart data={card.sparkline} />
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div
        style={{
          background: 'var(--admin-surface)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--admin-border)',
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 20,
            color: 'var(--admin-text)',
            marginBottom: 20,
          }}
        >
          Revenue mensuelle
        </h2>
        <RevenueChart data={data.chartData} />
      </div>

      {/* Activity + Campaigns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 24,
        }}
      >
        {/* Recent activity */}
        <div
          style={{
            background: 'var(--admin-surface)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 20,
              color: 'var(--admin-text)',
              marginBottom: 20,
            }}
          >
            Activité récente
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,.04)' : 'none',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background:
                      item.type === 'purchase'
                        ? 'var(--admin-accent)'
                        : item.type === 'member'
                          ? 'var(--admin-success)'
                          : 'var(--admin-text-muted)',
                  }}
                />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--admin-text-muted)' }}>
                  {item.text}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--admin-text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {relativeTime(item.date)}
                </span>
              </div>
            ))}
            {data.recentActivity.length === 0 && (
              <div style={{ color: 'var(--admin-text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                Aucune activité récente
              </div>
            )}
          </div>
        </div>

        {/* Campaigns widget */}
        <div
          style={{
            background: 'var(--admin-surface)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--admin-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: 20, color: 'var(--admin-text)' }}>
              Campagnes
            </h2>
            <Link
              href="/admin/campagnes"
              style={{ fontSize: 13, color: 'var(--admin-accent)', fontWeight: 600 }}
            >
              Voir tout →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: 36,
                  fontWeight: 700,
                  color: 'var(--admin-accent)',
                }}
              >
                {data.campaigns.active}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                }}
              >
                Actives
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: 36,
                  fontWeight: 700,
                  color: 'var(--admin-accent)',
                }}
              >
                {data.campaigns.avgOpen}%
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                }}
              >
                Ouverture moy.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
