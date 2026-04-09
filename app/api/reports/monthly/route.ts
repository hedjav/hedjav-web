import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/reports/monthly
 * Bearer: INTERNAL_API_TOKEN
 *
 * Calcule les stats du mois précédent et crée une admin_notification type='report'.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const token = process.env.INTERNAL_API_TOKEN
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Calculer les bornes du mois précédent
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const start = startOfLastMonth.toISOString()
  const end = startOfThisMonth.toISOString()
  const monthLabel = startOfLastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // 1. Revenus et ventes
  const { data: purchases } = await db
    .from('purchases')
    .select('amount')
    .eq('status', 'paid')
    .gte('created_at', start)
    .lt('created_at', end)

  const revenue = (purchases ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const salesCount = purchases?.length ?? 0

  // 2. Inscriptions (nouveaux profils)
  const { count: registrations } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)

  // 3. Abonnés newsletter
  const { count: newSubscribers } = await db
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('subscribed_at', start)
    .lt('subscribed_at', end)

  // 4. Désabonnements newsletter
  const { count: unsubscribes } = await db
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .not('unsubscribed_at', 'is', null)
    .gte('unsubscribed_at', start)
    .lt('unsubscribed_at', end)

  // 5. Pages vues
  const { count: pageViews } = await db
    .from('page_views')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)

  // 6. Articles publiés
  const { count: articlesPublished } = await db
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .gte('published_at', start)
    .lt('published_at', end)

  const stats = {
    month: monthLabel,
    revenue,
    salesCount,
    registrations: registrations ?? 0,
    newSubscribers: newSubscribers ?? 0,
    unsubscribes: unsubscribes ?? 0,
    pageViews: pageViews ?? 0,
    articlesPublished: articlesPublished ?? 0,
  }

  const formattedRevenue = new Intl.NumberFormat('fr-FR').format(revenue)

  // Créer la notification admin
  const message = [
    `Rapport mensuel — ${monthLabel}`,
    ``,
    `Revenus : ${formattedRevenue} FCFA (${salesCount} vente${salesCount > 1 ? 's' : ''})`,
    `Inscriptions : ${stats.registrations}`,
    `Newsletter : +${stats.newSubscribers} abonnés, ${stats.unsubscribes} désabonnement${stats.unsubscribes > 1 ? 's' : ''}`,
    `Pages vues : ${stats.pageViews}`,
    `Articles publiés : ${stats.articlesPublished}`,
  ].join('\n')

  const { error: insertErr } = await db.from('admin_notifications').insert({
    type: 'report',
    title: `Rapport mensuel — ${monthLabel}`,
    message,
    is_read: false,
    priority: 'normal',
    metadata: stats,
  })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Rapport mensuel créé', stats })
}
