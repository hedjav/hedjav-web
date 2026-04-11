import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Purchase, Ebook } from '@/lib/supabase/types'

export type PurchaseWithEbook = Purchase & { ebook: Ebook | null }

/**
 * Client Supabase service-role pour lire les purchases côté serveur.
 *
 * Pourquoi service-role plutôt que user session : les RLS sur `purchases` et
 * `ebooks` peuvent masquer des lignes au user légitime dans 2 cas observés en prod :
 *   1. La sous-requête `(select email from auth.users where id = auth.uid())` dans
 *      la policy purchases_select_own peut échouer silencieusement si le user n'a
 *      pas SELECT sur auth.users.
 *   2. La RLS ebooks `is_published = true` filtre les ebooks dépubliés dans les
 *      joins, et on perd alors la purchase associée.
 *
 * On vérifie la session user côté serveur AVANT d'utiliser le service-role, donc
 * zéro risque de fuite : on ne lit que les purchases du user authentifié.
 */
function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getCurrentUserPurchases(): Promise<PurchaseWithEbook[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Service-role pour bypass les RLS trompeuses
  const admin = adminClient()
  const { data, error } = await admin
    .from('purchases')
    .select('*, ebook:ebooks(*)')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[purchases] getCurrentUserPurchases', error)
    return []
  }
  return (data ?? []) as PurchaseWithEbook[]
}

export async function getCurrentUserPaidEbooks(): Promise<Ebook[]> {
  const purchases = await getCurrentUserPurchases()
  return purchases
    .filter((p) => p.status === 'paid' && p.ebook)
    .map((p) => p.ebook as Ebook)
}

/**
 * Type enrichi : l'ebook est désormais OPTIONNEL (peut être null si l'ebook
 * a été supprimé/dépublié depuis l'achat). L'UI doit savoir afficher une carte
 * "fantôme" dans ce cas plutôt que de faire disparaître l'achat.
 */
export type PaidPurchaseView = {
  purchaseId: string
  ebookId: string
  ebook: Ebook | null // null si ebook supprimé/dépublié
  invoiceUrl: string | null
  purchaseCreatedAt: string
  amount: number
}

/**
 * Retourne les achats payés du user courant avec ebook + facture joints.
 * Utilisé par /dashboard/mes-ebooks.
 *
 * Contrairement à l'ancienne version, cette fonction :
 *   - utilise le service-role pour bypass les RLS qui masquaient des lignes
 *   - conserve les achats dont l'ebook est null (ebook supprimé/dépublié)
 *   - loggue explicitement chaque purchase trouvée pour faciliter le debug
 */
export async function getCurrentUserPaidEbooksWithInvoices(): Promise<PaidPurchaseView[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const admin = adminClient()
  const { data, error } = await admin
    .from('purchases')
    .select('id, ebook_id, status, amount, created_at, ebook:ebooks(*), invoices:invoices(pdf_url)')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[purchases] getCurrentUserPaidEbooksWithInvoices:', error.message)
    return []
  }

  const rows = (data ?? []) as Array<{
    id: string
    ebook_id: string
    status: string
    amount: number
    created_at: string
    ebook: Ebook | Ebook[] | null
    invoices: Array<{ pdf_url: string | null }> | null
  }>

  console.log(
    `[purchases/paid] user=${user.id} email=${user.email} found=${rows.length} paid purchases`
  )

  return rows.map((p) => {
    // Supabase peut retourner le join en objet ou en array selon la config
    const ebook = Array.isArray(p.ebook) ? p.ebook[0] ?? null : p.ebook
    const invoices = p.invoices ?? []
    return {
      purchaseId: p.id,
      ebookId: p.ebook_id,
      ebook,
      invoiceUrl: invoices[0]?.pdf_url ?? null,
      purchaseCreatedAt: p.created_at,
      amount: p.amount,
    }
  })
}

/**
 * Retourne les achats du user en statut pending (UNIQUEMENT).
 * Dédupliqués par ebook_id : on garde seulement la purchase la plus récente
 * par ebook pour éviter d'afficher 4 lignes quand le client a cliqué 4 fois.
 *
 * Les purchases 'failed' sont volontairement exclues (bruit inutile pour le user).
 * Utilisé par /dashboard/mes-ebooks pour la section "commandes en attente".
 */
export async function getCurrentUserPendingPurchases(): Promise<
  Array<{
    purchaseId: string
    ebookId: string
    ebookTitle: string
    status: string
    amount: number
    createdAt: string
    paymentRef: string
    otherAttemptsCount: number
  }>
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const admin = adminClient()
  // N'affiche que les pending < 2h. Plus vieilles = abandonnées, seront
  // auto-cancellées par /api/admin/purchases/cancel-stale. Les cacher évite
  // les fausses alertes "tu as une commande en attente" sur des purchases
  // mortes depuis 3 jours.
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const { data, error } = await admin
    .from('purchases')
    .select('id, ebook_id, status, amount, created_at, payment_ref, ebook:ebooks(title)')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq('status', 'pending')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[purchases] getCurrentUserPendingPurchases:', error.message)
    return []
  }

  const rows = (data ?? []) as Array<{
    id: string
    ebook_id: string
    status: string
    amount: number
    created_at: string
    payment_ref: string
    ebook: { title: string } | { title: string }[] | null
  }>

  // Dédup : une entrée par ebook_id, on garde la plus récente (les rows sont
  // déjà triées par created_at DESC)
  const seen = new Map<
    string,
    { row: (typeof rows)[number]; count: number }
  >()
  for (const row of rows) {
    const existing = seen.get(row.ebook_id)
    if (existing) {
      existing.count += 1
    } else {
      seen.set(row.ebook_id, { row, count: 1 })
    }
  }

  return Array.from(seen.values()).map(({ row: p, count }) => {
    const ebook = Array.isArray(p.ebook) ? p.ebook[0] : p.ebook
    return {
      purchaseId: p.id,
      ebookId: p.ebook_id,
      ebookTitle: ebook?.title ?? '(ebook inconnu)',
      status: p.status,
      amount: p.amount,
      createdAt: p.created_at,
      paymentRef: p.payment_ref,
      otherAttemptsCount: count - 1, // combien de tentatives en plus de la plus récente
    }
  })
}
