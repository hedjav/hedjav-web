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

/**
 * Retourne les ebooks achetés avec en plus l'URL de facture éventuelle
 * (jointure sur la table `invoices` via purchase_id).
 * Utilisé par /dashboard/mes-ebooks pour afficher le bouton "Voir la facture".
 */
export async function getCurrentUserPaidEbooksWithInvoices(): Promise<
  Array<{ ebook: Ebook; invoiceUrl: string | null; purchaseId: string }>
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('purchases')
    .select('id, status, ebook:ebooks(*), invoices:invoices(pdf_url)')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[purchases] getCurrentUserPaidEbooksWithInvoices', error)
    return []
  }

  return (data ?? [])
    .filter((p: Record<string, unknown>) => p.ebook !== null)
    .map((p: Record<string, unknown>) => {
      const invoices = (p.invoices as Array<{ pdf_url: string | null }> | null) ?? []
      return {
        ebook: p.ebook as unknown as Ebook,
        invoiceUrl: invoices[0]?.pdf_url ?? null,
        purchaseId: p.id as string,
      }
    })
}
