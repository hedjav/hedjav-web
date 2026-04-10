import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/ebooks/upload-file
 * Multipart/form-data : { file: File, ebook_id: string }
 *
 * Upload du fichier livrable d'un ebook dans le bucket privé 'ebook-files',
 * puis update de ebooks.file_path + file_size_bytes + file_uploaded_at.
 *
 * Protégé par session admin. Utilisé depuis /admin/ebooks/[id].
 *
 * Le bucket est privé (migration 021) → aucun accès direct possible.
 * La livraison passe par /api/ebooks/download qui génère une signed URL.
 */
export async function POST(request: Request) {
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

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const ebookId = formData.get('ebook_id') as string | null

  if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
  if (!ebookId) return NextResponse.json({ error: 'ebook_id requis' }, { status: 400 })

  // Taille max : 100 MB (aligné avec la limite du bucket)
  const MAX_SIZE = 100 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` },
      { status: 413 }
    )
  }

  // Types autorisés : PDF, ePub, ZIP (bundle)
  const ALLOWED_TYPES = ['application/pdf', 'application/epub+zip', 'application/zip']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Type non autorisé : ${file.type}. Types acceptés : PDF, ePub, ZIP.` },
      { status: 415 }
    )
  }

  // Service-role client pour bypass RLS (le bucket est privé)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Vérifier que l'ebook existe
  const { data: ebook, error: ebookErr } = await admin
    .from('ebooks')
    .select('id, slug, file_path')
    .eq('id', ebookId)
    .maybeSingle()

  if (ebookErr || !ebook) {
    return NextResponse.json({ error: 'Ebook introuvable' }, { status: 404 })
  }

  // Chemin : ebooks/{slug}-{timestamp}.pdf (slug → lisible, timestamp → versionnage naturel)
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'pdf' : 'pdf'
  const timestamp = Date.now()
  const storagePath = `ebooks/${ebook.slug}-${timestamp}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('ebook-files')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    console.error('[admin/ebooks/upload-file] upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Nettoyage de l'ancien fichier si existant (évite les orphelins dans le bucket)
  if (ebook.file_path && ebook.file_path !== storagePath) {
    await admin.storage.from('ebook-files').remove([ebook.file_path]).catch(() => {
      // Non-bloquant : si le vieux fichier n'existe plus, on s'en fiche
    })
  }

  // Update la ligne ebooks
  const { error: updateErr } = await admin
    .from('ebooks')
    .update({
      file_path: storagePath,
      file_size_bytes: file.size,
      file_uploaded_at: new Date().toISOString(),
    })
    .eq('id', ebookId)

  if (updateErr) {
    // Rollback : supprimer le fichier uploadé
    await admin.storage.from('ebook-files').remove([storagePath]).catch(() => {})
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    file_path: storagePath,
    file_size_bytes: file.size,
  })
}
