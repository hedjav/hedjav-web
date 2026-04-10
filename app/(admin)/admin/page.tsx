import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SparklineChart } from '@/components/admin/SparklineChart'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { TopEbooksWidget } from '@/components/admin/TopEbooksWidget'
import { CountryChart } from '@/components/admin/CountryChart'

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
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // --- TACHE 1: Performance queries — only last 12 months + head counts ---

  const [
    { data: purchases12m },
    { data: profiles12m },
    { data: subs12m },
    { count: totalPurchasesAllTime },
    { count: totalProfilesAllTime },
    { count: totalSubsAllTime },
    { data: allEbooks },
    { data: purchasesForEbooks },
    { data: allProfilesWithCountry },
    { data: subsWithSource },
    { count: pendingCount },
    { count: activeCampaigns },
  ] = await Promise.all([
    // 12-month windowed data
    supabase
      .from('purchases')
      .select('amount, created_at, email, status, ebook_id')
      .eq('status', 'paid')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('newsletter_subscribers')
      .select('email, is_active, subscribed_at, source')
      .eq('is_active', true)
      .gte('subscribed_at', twelveMonthsAgo.toISOString())
      .order('subscribed_at', { ascending: true }),
    // All-time counts (head: true — no data transferred)
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    // Ebooks for top ebooks widget
    supabase.from('ebooks').select('id, title, slug'),
    // All paid purchases for top ebooks (need all time)
    supabase
      .from('purchases')
      .select('ebook_id, amount')
      .eq('status', 'paid'),
    // Profiles with country for country chart
    supabase.from('profiles').select('country'),
    // Newsletter with source for source badges
    supabase
      .from('newsletter_subscribers')
      .select('source')
      .eq('is_active', true),
    // Pending purchases >24h for alerts
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 86400000).toISOString()),
    // Active campaigns count
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const purchases = purchases12m ?? []
  const profiles = profiles12m ?? []
  const subs = subs12m ?? []

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

  // Members this month
  const membersThisMonth = membersPerMonth[thisKey] ?? 0
  const membersLastMonthCount = membersPerMonth[lastKey] ?? 0

  // Newsletter this month
  const subsThisMonth = subsPerMonth[thisKey] ?? 0
  const subsLastMonth = subsPerMonth[lastKey] ?? 0

  // --- TACHE 3: Top ebooks ---
  const ebookMap = new Map<string, { title: string; slug: string }>()
  for (const e of allEbooks ?? []) {
    ebookMap.set(e.id, { title: e.title, slug: e.slug })
  }
  const ebookSales = new Map<string, { sales: number; revenue: number }>()
  for (const p of purchasesForEbooks ?? []) {
    const id = p.ebook_id
    if (!id) continue
    const existing = ebookSales.get(id) ?? { sales: 0, revenue: 0 }
    existing.sales++
    existing.revenue += p.amount
    ebookSales.set(id, existing)
  }
  const topEbooks = [...ebookSales.entries()]
    .map(([id, stats]) => {
      const info = ebookMap.get(id)
      return {
        title: info?.title ?? 'Inconnu',
        slug: info?.slug ?? '',
        sales: stats.sales,
        revenue: stats.revenue,
      }
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  // --- TACHE 4: Country distribution ---
  const countryMap = new Map<string, number>()
  for (const p of allProfilesWithCountry ?? []) {
    const c = p.country ?? 'Inconnu'
    countryMap.set(c, (countryMap.get(c) ?? 0) + 1)
  }
  const countryData = [...countryMap.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // --- TACHE 5: Newsletter sources ---
  const sourceMap = new Map<string, number>()
  for (const s of subsWithSource ?? []) {
    const src = s.source ?? 'inconnu'
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1)
  }
  const newsletterSources = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // --- TACHE 6: Alerts ---
  const alerts: { type: 'warning' | 'danger' | 'info'; text: string }[] = []
  if ((pendingCount ?? 0) > 0) {
    alerts.push({
      type: 'danger',
      text: `${pendingCount} achat(s) en attente depuis +24h`,
    })
  }
  if ((activeCampaigns ?? 0) === 0) {
    alerts.push({
      type: 'info',
      text: 'Aucune campagne active',
    })
  }

  // Campaign stats
  const { data: sends } = await supabase
    .from('campaign_sends')
    .select('status')
    .in('status', ['sent', 'opened', 'clicked'])
  const allSends = sends ?? []
  const opened = allSends.filter((s) => s.status === 'opened' || s.status === 'clicked').length
  const avgOpen = allSends.length > 0 ? Math.round((opened / allSends.length) * 100) : 0

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
        value: String(totalProfilesAllTime ?? 0),
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
        value: String(totalSubsAllTime ?? 0),
        change: pctChange(subsThisMonth, subsLastMonth),
        sparkline: subsSparkline,
      },
    ],
    chartData,
    topEbooks,
    countryData,
    newsletterSources,
    alerts,
    recentActivity: await getRecentActivity(supabase),
    campaigns: { active: activeCampaigns ?? 0, avgOpen },
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

/* ---------- source badge colors ---------- */
const SOURCE_COLORS: Record<string, string> = {
  home: '#C5A028',
  popup: '#4A90D9',
  article: '#50C878',
  register: '#9B59B6',
  footer: '#E07050',
}

function sourceBadgeColor(source: string) {
  return SOURCE_COLORS[source] ?? 'var(--admin-text-muted)'
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

      {/* --- TACHE 6: Alertes --- */}
      {data.alerts.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                background:
                  alert.type === 'danger'
                    ? 'rgba(231,76,60,.12)'
                    : alert.type === 'warning'
                      ? 'rgba(197,160,40,.12)'
                      : 'rgba(74,144,217,.10)',
                color:
                  alert.type === 'danger'
                    ? '#ff9b9b'
                    : alert.type === 'warning'
                      ? '#C5A028'
                      : '#8BACD9',
                border: `1px solid ${
                  alert.type === 'danger'
                    ? 'rgba(231,76,60,.25)'
                    : alert.type === 'warning'
                      ? 'rgba(197,160,40,.25)'
                      : 'rgba(74,144,217,.20)'
                }`,
              }}
            >
              <span style={{ fontSize: 16 }}>
                {alert.type === 'danger' ? '\u26A0' : alert.type === 'warning' ? '\u26A0' : '\u2139'}
              </span>
              {alert.text}
            </div>
          ))}
        </div>
      )}

      {/* --- TACHE 7: Grid layout --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'var(--s4, 16px)',
        }}
      >
        {/* Stats cards — 3 cols each on 12-col grid */}
        {data.cards.map((card) => (
          <div
            key={card.label}
            style={{
              gridColumn: 'span 3',
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

        {/* Revenue chart — 8 cols */}
        <div
          style={{
            gridColumn: 'span 8',
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
            Revenue mensuelle
          </h2>
          <RevenueChart data={data.chartData} />
        </div>

        {/* Top ebooks — 4 cols */}
        <div
          style={{
            gridColumn: 'span 4',
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
            Top ebooks vendus
          </h2>
          <TopEbooksWidget data={data.topEbooks} />
        </div>

        {/* Activity — 6 cols */}
        <div
          style={{
            gridColumn: 'span 6',
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

        {/* Country chart — 3 cols */}
        <div
          style={{
            gridColumn: 'span 3',
            background: 'var(--admin-surface)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 18,
              color: 'var(--admin-text)',
              marginBottom: 16,
            }}
          >
            Répartition pays
          </h2>
          <CountryChart data={data.countryData} />
        </div>

        {/* Newsletter sources — 3 cols */}
        <div
          style={{
            gridColumn: 'span 3',
            background: 'var(--admin-surface)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 18,
              color: 'var(--admin-text)',
              marginBottom: 16,
            }}
          >
            Sources newsletter
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.newsletterSources.map((s) => (
              <div
                key={s.source}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: `${sourceBadgeColor(s.source)}20`,
                  color: sourceBadgeColor(s.source),
                  border: `1px solid ${sourceBadgeColor(s.source)}30`,
                }}
              >
                {s.source}
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {s.count}
                </span>
              </div>
            ))}
            {data.newsletterSources.length === 0 && (
              <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>
                Aucun abonné
              </div>
            )}
          </div>
        </div>

        {/* Campaigns — full width */}
        <div
          style={{
            gridColumn: 'span 12',
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
              maxWidth: 320,
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
