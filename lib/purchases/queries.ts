import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Purchase, Ebook } from '@/lib/supabase/types'

export type PurchaseWithEbook = Purchase & { ebook: Ebook | null }

export async function getCurrentUserPurchases(): Promise<PurchaseWithEbook[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
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
