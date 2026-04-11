import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/ebooks/download?ebook_id=XXX
 *
 * Livraison sécurisée des ebooks après achat.
 *
 * Flux :
 *  1. Vérifie la session user (redirect /login si absente, avec next=...)
 *  2. Cherche une purchase 'paid' pour cet ebook, matchée par user_id OU email
 *  3. Lit le file_path de l'ebook
 *  4. Génère une signed URL Supabase Storage valide 5 minutes
 *  5. Redirect 302 vers la signed URL → le navigateur télécharge directement
 *
 * Gestion d'erreurs : au lieu de retourner du JSON brut (que le navigateur
 * afficherait tel quel), on redirige vers /dashboard/mes-ebooks?download_error=XXX
 * avec un code d'erreur précis, et l'UI affiche un message friendly.
 *
 * Sécurité :
 *  - Le bucket 'ebook-files' est privé, aucune policy publique (migration 021)
 *  - Le service-role est la seule voie de lecture
 *  - Les signed URLs expirent en 5 min → pas de lien partageable durable
 */
function redirectWithError(request: Request, code: string, debug?: string): NextResponse {
  const url = new URL('/dashboard/mes-ebooks', request.url)
  url.searchParams.set('download_error', code)
  if (debug && process.env.NODE_ENV !== 'production') {
    url.searchParams.set('debug', debug.slice(0, 200))
  }
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ebookId = url.searchParams.get('ebook_id')

  if (!ebookId) {
    console.warn('[ebooks/download] missing ebook_id')
    return redirectWithError(request, 'missing_ebook_id')
  }

  // 1. Session user
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr) {
    console.error('[ebooks/download] auth error:', authErr.message)
  }

  if (!user) {
    // Redirect vers login, avec next= pour revenir ici après auth
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `/api/ebooks/download?ebook_id=${ebookId}`)
    console.log('[ebooks/download] no session, redirect to login')
    return NextResponse.redirect(loginUrl)
  }

  // 2. Purchase paid : match user_id OU email (historique)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: purchase, error: purchaseErr } = await admin
    .from('purchases')
    .select('id, user_id, email, status, ebook_id')
    .eq('ebook_id', ebookId)
    .eq('status', 'paid')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  if (purchaseErr) {
    console.error('[ebooks/download] purchase query error:', purchaseErr.message)
    return redirectWithError(request, 'db_error', purchaseErr.message)
  }

  if (!purchase) {
    console.warn(
      `[ebooks/download] no paid purchase for ebook=${ebookId} user=${user.id} email=${user.email}`
    )
    return redirectWithError(request, 'not_purchased')
  }

  // 3. Ebook + file_path
  const { data: ebook, error: ebookErr } = await admin
    .from('ebooks')
    .select('id, title, slug, file_path, file_size_bytes')
    .eq('id', ebookId)
    .maybeSingle()

  if (ebookErr) {
    console.error('[ebooks/download] ebook query error:', ebookErr.message)
    // Erreur 42703 = colonne file_path n'existe pas (migration 021 pas appliquée)
    const code = ebookErr.message.includes('file_path') ? 'migration_missing' : 'db_error'
    return redirectWithError(request, code, ebookErr.message)
  }

  if (!ebook) {
    console.error(`[ebooks/download] ebook not found: ${ebookId}`)
    return redirectWithError(request, 'ebook_not_found')
  }

  if (!ebook.file_path) {
    console.warn(`[ebooks/download] ebook has no file_path: ${ebook.title} (${ebookId})`)
    return redirectWithError(request, 'file_not_uploaded')
  }

  // 4. Signed URL 5 minutes
  const { data: signed, error: signedErr } = await admin.storage
    .from('ebook-files')
    .createSignedUrl(ebook.file_path, 300, {
      download: `${ebook.slug}.pdf`,
    })

  if (signedErr || !signed?.signedUrl) {
    console.error('[ebooks/download] signed URL error:', signedErr?.message ?? 'no signedUrl')
    // Erreurs courantes :
    //  - "Bucket not found" → migration 021 pas appliquée
    //  - "Object not found" → file_path pointe vers un fichier qui n'existe plus
    //  - "Invalid JWT" → SUPABASE_SERVICE_ROLE_KEY invalide
    const msg = signedErr?.message ?? ''
    let code = 'signed_url_failed'
    if (msg.includes('Bucket not found') || msg.includes('bucket')) code = 'bucket_missing'
    else if (msg.includes('Object not found') || msg.includes('not_found')) code = 'file_missing_in_storage'
    else if (msg.includes('JWT') || msg.includes('auth')) code = 'service_role_invalid'
    return redirectWithError(request, code, msg)
  }

  console.log(`[ebooks/download] OK: ${ebook.title} → ${ebook.file_path}`)
  // 5. Redirect vers la signed URL
  return NextResponse.redirect(signed.signedUrl)
}
