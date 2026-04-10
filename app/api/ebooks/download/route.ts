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
 *     (historique : certaines purchases pré-auth n'ont pas de user_id)
 *  3. Lit le file_path de l'ebook
 *  4. Génère une signed URL Supabase Storage valide 5 minutes
 *  5. Redirect 302 vers la signed URL → le navigateur télécharge directement
 *
 * Sécurité :
 *  - Le bucket 'ebook-files' est privé, aucune policy publique (migration 021)
 *  - Le service-role est la seule voie de lecture
 *  - Les signed URLs expirent en 5 min → pas de lien partageable durable
 *  - Log admin_notifications pour traçage
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ebookId = url.searchParams.get('ebook_id')

  if (!ebookId) {
    return NextResponse.json({ error: 'ebook_id requis' }, { status: 400 })
  }

  // 1. Session user
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect vers login, avec next= pour revenir ici après auth
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `/api/ebooks/download?ebook_id=${ebookId}`)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Purchase paid : match user_id OU email (historique)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: purchase } = await admin
    .from('purchases')
    .select('id, user_id, email, status, ebook_id')
    .eq('ebook_id', ebookId)
    .eq('status', 'paid')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  if (!purchase) {
    return NextResponse.json(
      { error: "Vous n'avez pas acheté cet ebook.", hint: 'Si vous venez de payer, rafraîchissez dans quelques instants.' },
      { status: 403 }
    )
  }

  // 3. Ebook + file_path
  const { data: ebook } = await admin
    .from('ebooks')
    .select('id, title, slug, file_path, file_size_bytes')
    .eq('id', ebookId)
    .maybeSingle()

  if (!ebook) {
    return NextResponse.json({ error: 'Ebook introuvable' }, { status: 404 })
  }

  if (!ebook.file_path) {
    // L'ebook n'a pas encore de fichier uploadé côté admin
    return NextResponse.json(
      {
        error: 'Fichier non disponible',
        message:
          "L'équipe Hedjav n'a pas encore uploadé le fichier de cet ebook. Nous avons été notifiés et vous recevrez un email dès que c'est prêt.",
      },
      { status: 503 }
    )
  }

  // 4. Signed URL 5 minutes
  const { data: signed, error: signedErr } = await admin.storage
    .from('ebook-files')
    .createSignedUrl(ebook.file_path, 300, {
      download: `${ebook.slug}.pdf`, // force Content-Disposition: attachment avec un nom propre
    })

  if (signedErr || !signed?.signedUrl) {
    console.error('[ebooks/download] signed URL error:', signedErr)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du lien de téléchargement' },
      { status: 500 }
    )
  }

  // 5. Redirect vers la signed URL
  return NextResponse.redirect(signed.signedUrl)
}
