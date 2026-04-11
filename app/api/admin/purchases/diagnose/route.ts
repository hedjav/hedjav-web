import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/purchases/diagnose?email=XXX
 * GET /api/admin/purchases/diagnose?purchase_id=XXX
 * GET /api/admin/purchases/diagnose?user_id=XXX
 *
 * Diagnostic complet des purchases d'un user, utile quand un client dit
 * "j'ai payé mais rien dans ma bibliothèque".
 *
 * Retourne :
 *  - Toutes les purchases (tous statuts confondus) matchées par email/user_id
 *  - L'état de chaque purchase (status, date, montant, payment_ref)
 *  - L'ebook associé (titre, slug, file_path, publié)
 *  - Les facturess associées
 *  - Un diagnostic global : "tout OK" / "purchase pending" / "ebook dépublié" / etc.
 *
 * Auth : session admin obligatoire.
 */
type DiagnoseResult = {
  query: { email?: string; purchase_id?: string; user_id?: string }
  purchases: Array<{
    id: string
    user_id: string | null
    email: string
    ebook_id: string
    amount: number
    status: string
    payment_ref: string
    payment_method: string | null
    created_at: string
    ebook: {
      id: string
      title: string
      slug: string
      is_published: boolean
      has_file_path: boolean
      file_path: string | null
    } | null
    invoice_url: string | null
    // Diagnostic simple par row
    diagnostic: string[]
  }>
  global_diagnostic: string[]
}

export async function GET(request: Request) {
  // Auth admin
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const purchaseId = url.searchParams.get('purchase_id')
  const userId = url.searchParams.get('user_id')

  if (!email && !purchaseId && !userId) {
    return NextResponse.json(
      { error: 'Spécifier ?email=XXX ou ?purchase_id=XXX ou ?user_id=XXX' },
      { status: 400 }
    )
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Build la query selon le filtre demandé
  let query = admin
    .from('purchases')
    .select(
      'id, user_id, email, ebook_id, amount, status, payment_ref, payment_method, created_at, ebook:ebooks(id, title, slug, is_published, file_path), invoices:invoices(pdf_url)'
    )
    .order('created_at', { ascending: false })

  if (purchaseId) query = query.eq('id', purchaseId)
  else if (userId) query = query.eq('user_id', userId)
  else if (email) query = query.eq('email', email)

  const { data: rows, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const purchases = (rows ?? []).map((r: Record<string, unknown>) => {
    const ebookJoin = r.ebook as
      | { id: string; title: string; slug: string; is_published: boolean; file_path: string | null }
      | Array<{ id: string; title: string; slug: string; is_published: boolean; file_path: string | null }>
      | null
    const ebook = Array.isArray(ebookJoin) ? ebookJoin[0] : ebookJoin
    const invoices = (r.invoices as Array<{ pdf_url: string | null }> | null) ?? []

    const diagnostic: string[] = []
    if (r.status !== 'paid') {
      diagnostic.push(
        `⚠ Status = ${r.status} — le webhook FedaPay n'a pas confirmé le paiement.`
      )
    }
    if (r.user_id === null && r.status === 'paid') {
      diagnostic.push(
        `⚠ user_id = null — purchase créée pré-auth ou webhook n'a pas retrouvé le compte. Match par email uniquement.`
      )
    }
    if (ebook && !ebook.is_published) {
      diagnostic.push(
        `⚠ Ebook "${ebook.title}" est DÉPUBLIÉ (is_published=false) — la page /dashboard/mes-ebooks n'affichera pas cet achat tant qu'il n'est pas republié.`
      )
    }
    if (ebook && !ebook.file_path && r.status === 'paid') {
      diagnostic.push(
        `⚠ Ebook "${ebook.title}" n'a pas de file_path — même si le client peut le voir, le téléchargement échouera. Upload le PDF via /admin/ebooks/${ebook.id}.`
      )
    }
    if (!ebook) {
      diagnostic.push(
        `✗ Ebook introuvable (id=${r.ebook_id}) — référence cassée, ebook probablement supprimé.`
      )
    }
    if (r.status === 'paid' && ebook && ebook.is_published && ebook.file_path) {
      diagnostic.push(`✓ OK — cet achat devrait être visible et téléchargeable.`)
    }

    return {
      id: r.id as string,
      user_id: (r.user_id as string | null) ?? null,
      email: r.email as string,
      ebook_id: r.ebook_id as string,
      amount: r.amount as number,
      status: r.status as string,
      payment_ref: (r.payment_ref as string) ?? '',
      payment_method: (r.payment_method as string | null) ?? null,
      created_at: r.created_at as string,
      ebook: ebook
        ? {
            id: ebook.id,
            title: ebook.title,
            slug: ebook.slug,
            is_published: ebook.is_published,
            has_file_path: Boolean(ebook.file_path),
            file_path: ebook.file_path ?? null,
          }
        : null,
      invoice_url: invoices[0]?.pdf_url ?? null,
      diagnostic,
    }
  })

  // Diagnostic global
  const globalDiagnostic: string[] = []
  if (purchases.length === 0) {
    globalDiagnostic.push(`Aucune purchase trouvée pour cette requête.`)
  } else {
    const paid = purchases.filter((p) => p.status === 'paid').length
    const pending = purchases.filter((p) => p.status === 'pending').length
    const failed = purchases.filter((p) => p.status === 'failed').length
    globalDiagnostic.push(
      `${purchases.length} purchase(s) trouvée(s) : ${paid} paid, ${pending} pending, ${failed} failed.`
    )

    const unpublished = purchases.filter(
      (p) => p.status === 'paid' && p.ebook && !p.ebook.is_published
    )
    if (unpublished.length > 0) {
      globalDiagnostic.push(
        `⚠ ${unpublished.length} achat(s) payé(s) pointent vers un ebook dépublié — client ne les verra pas dans /dashboard/mes-ebooks tant que l'ebook n'est pas republié.`
      )
    }

    const noFile = purchases.filter(
      (p) => p.status === 'paid' && p.ebook && !p.ebook.has_file_path
    )
    if (noFile.length > 0) {
      globalDiagnostic.push(
        `⚠ ${noFile.length} achat(s) payé(s) pointent vers un ebook sans file_path — téléchargement impossible tant que l'admin n'uploade pas le PDF.`
      )
    }

    const pendingOld = purchases.filter((p) => {
      if (p.status !== 'pending') return false
      const hours = (Date.now() - new Date(p.created_at).getTime()) / 3600000
      return hours > 1
    })
    if (pendingOld.length > 0) {
      globalDiagnostic.push(
        `⚠ ${pendingOld.length} purchase(s) en pending depuis plus d'1h — probable webhook FedaPay raté. À vérifier manuellement dans le dashboard FedaPay.`
      )
    }
  }

  const result: DiagnoseResult = {
    query: { email: email ?? undefined, purchase_id: purchaseId ?? undefined, user_id: userId ?? undefined },
    purchases,
    global_diagnostic: globalDiagnostic,
  }

  return NextResponse.json(result)
}
