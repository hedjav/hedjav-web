import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/ebooks/diagnose?ebook_id=XXX
 *
 * Diagnostic complet du flux de livraison ebook pour un ebook donné.
 * Vérifie chaque étape et retourne un rapport détaillé indiquant exactement
 * ce qui cloche.
 *
 * Utilisé depuis l'admin pour déboguer rapidement les bugs de livraison.
 *
 * Auth : session admin obligatoire.
 *
 * Checks :
 *  1. Migration 021 appliquée (ebooks.file_path existe)
 *  2. Bucket 'ebook-files' existe
 *  3. Ebook existe et est publié
 *  4. Ebook.file_path renseigné
 *  5. Fichier existe vraiment dans le bucket
 *  6. Signed URL se génère correctement
 *  7. Au moins une purchase paid existe (exemple)
 */
type CheckResult = {
  id: string
  label: string
  status: 'ok' | 'fail' | 'warning' | 'skipped'
  detail: string
  hint?: string
}

export async function GET(request: Request) {
  // Auth admin
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const ebookId = url.searchParams.get('ebook_id')
  if (!ebookId) {
    return NextResponse.json({ error: 'ebook_id requis' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const checks: CheckResult[] = []

  // 1. Migration 021 — essayer de select file_path
  const { data: ebook, error: ebookErr } = await admin
    .from('ebooks')
    .select('id, title, slug, is_published, file_path, file_size_bytes, file_uploaded_at')
    .eq('id', ebookId)
    .maybeSingle()

  if (ebookErr) {
    checks.push({
      id: 'migration_021',
      label: 'Migration 021 appliquée (ebooks.file_path)',
      status: 'fail',
      detail: `Erreur query: ${ebookErr.message}`,
      hint: ebookErr.message.includes('file_path')
        ? 'Applique supabase/migrations/021_ebook_files.sql dans Supabase Dashboard → SQL Editor'
        : 'Erreur Supabase inconnue — vérifie les credentials',
    })
    return NextResponse.json({ ok: false, ebook_id: ebookId, checks }, { status: 200 })
  }

  checks.push({
    id: 'migration_021',
    label: 'Migration 021 appliquée (ebooks.file_path)',
    status: 'ok',
    detail: 'Colonne file_path accessible',
  })

  // 2. Ebook existe
  if (!ebook) {
    checks.push({
      id: 'ebook_exists',
      label: 'Ebook existe',
      status: 'fail',
      detail: `Ebook ${ebookId} introuvable`,
      hint: 'Vérifie l\'UUID dans /admin/ebooks',
    })
    return NextResponse.json({ ok: false, ebook_id: ebookId, checks }, { status: 200 })
  }

  checks.push({
    id: 'ebook_exists',
    label: 'Ebook existe',
    status: 'ok',
    detail: `${ebook.title} (${ebook.slug})`,
  })

  // 3. Ebook publié
  if (!ebook.is_published) {
    checks.push({
      id: 'ebook_published',
      label: 'Ebook publié',
      status: 'warning',
      detail: 'Ebook non publié (is_published = false)',
      hint: 'Les clients ne peuvent pas l\'acheter mais ceux qui l\'ont déjà devraient quand même pouvoir le télécharger',
    })
  } else {
    checks.push({
      id: 'ebook_published',
      label: 'Ebook publié',
      status: 'ok',
      detail: 'is_published = true',
    })
  }

  // 4. file_path renseigné
  if (!ebook.file_path) {
    checks.push({
      id: 'file_path_set',
      label: 'file_path renseigné',
      status: 'fail',
      detail: 'ebooks.file_path est NULL — aucun PDF uploadé',
      hint: 'Va sur /admin/ebooks/[id] et uploade un PDF via le composant EbookFileUploader',
    })
    return NextResponse.json({ ok: false, ebook_id: ebookId, ebook, checks }, { status: 200 })
  }

  checks.push({
    id: 'file_path_set',
    label: 'file_path renseigné',
    status: 'ok',
    detail: `${ebook.file_path} (${ebook.file_size_bytes ? (ebook.file_size_bytes / 1024 / 1024).toFixed(2) + ' MB' : 'taille inconnue'})`,
  })

  // 5. Bucket existe
  const { data: buckets, error: bucketListErr } = await admin.storage.listBuckets()
  if (bucketListErr) {
    checks.push({
      id: 'bucket_exists',
      label: 'Bucket ebook-files existe',
      status: 'fail',
      detail: `Erreur listBuckets: ${bucketListErr.message}`,
      hint: 'Vérifie SUPABASE_SERVICE_ROLE_KEY dans .env.local',
    })
  } else {
    const bucket = buckets?.find((b) => b.id === 'ebook-files')
    if (!bucket) {
      checks.push({
        id: 'bucket_exists',
        label: 'Bucket ebook-files existe',
        status: 'fail',
        detail: 'Bucket ebook-files absent',
        hint: 'Applique supabase/migrations/021_ebook_files.sql qui crée le bucket',
      })
      return NextResponse.json({ ok: false, ebook_id: ebookId, ebook, checks }, { status: 200 })
    }
    if (bucket.public) {
      checks.push({
        id: 'bucket_exists',
        label: 'Bucket ebook-files existe',
        status: 'warning',
        detail: 'Bucket existe mais il est PUBLIC (devrait être privé)',
        hint: 'Dans Supabase Dashboard → Storage → ebook-files → Settings, désactive public',
      })
    } else {
      checks.push({
        id: 'bucket_exists',
        label: 'Bucket ebook-files existe',
        status: 'ok',
        detail: 'Bucket privé OK',
      })
    }
  }

  // 6. Fichier existe dans le bucket
  const { data: fileData, error: fileErr } = await admin.storage
    .from('ebook-files')
    .list(ebook.file_path.split('/').slice(0, -1).join('/') || undefined, {
      search: ebook.file_path.split('/').pop(),
    })

  const fileName = ebook.file_path.split('/').pop()
  const fileExists = fileData?.some((f) => f.name === fileName)

  if (fileErr) {
    checks.push({
      id: 'file_in_bucket',
      label: 'Fichier présent dans le bucket',
      status: 'fail',
      detail: `Erreur list: ${fileErr.message}`,
    })
  } else if (!fileExists) {
    checks.push({
      id: 'file_in_bucket',
      label: 'Fichier présent dans le bucket',
      status: 'fail',
      detail: `file_path = "${ebook.file_path}" mais aucun fichier trouvé dans le bucket`,
      hint: 'Le fichier a été supprimé ou le path est incorrect. Re-upload le PDF depuis /admin/ebooks/[id]',
    })
    return NextResponse.json({ ok: false, ebook_id: ebookId, ebook, checks }, { status: 200 })
  } else {
    checks.push({
      id: 'file_in_bucket',
      label: 'Fichier présent dans le bucket',
      status: 'ok',
      detail: `Fichier "${fileName}" trouvé dans le bucket`,
    })
  }

  // 7. Signed URL génère
  const { data: signed, error: signedErr } = await admin.storage
    .from('ebook-files')
    .createSignedUrl(ebook.file_path, 60, { download: `${ebook.slug}.pdf` })

  if (signedErr || !signed?.signedUrl) {
    checks.push({
      id: 'signed_url',
      label: 'Signed URL se génère',
      status: 'fail',
      detail: signedErr?.message ?? 'signedUrl est null',
      hint: 'Erreur inhabituelle. Vérifie les logs PM2 et les credentials service-role',
    })
  } else {
    checks.push({
      id: 'signed_url',
      label: 'Signed URL se génère',
      status: 'ok',
      detail: `URL générée (expire 60s), premiers 80 chars: ${signed.signedUrl.slice(0, 80)}...`,
    })
  }

  // 8. Au moins une purchase paid existe (info seulement)
  const { count: paidCount } = await admin
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('ebook_id', ebookId)
    .eq('status', 'paid')

  checks.push({
    id: 'paid_purchases',
    label: 'Achats payés existants',
    status: (paidCount ?? 0) > 0 ? 'ok' : 'warning',
    detail: `${paidCount ?? 0} purchase(s) avec status='paid'`,
    hint: (paidCount ?? 0) === 0 ? 'Personne n\'a encore acheté cet ebook avec un paiement confirmé' : undefined,
  })

  const hasFail = checks.some((c) => c.status === 'fail')
  return NextResponse.json({
    ok: !hasFail,
    ebook_id: ebookId,
    ebook,
    checks,
    summary: `${checks.filter((c) => c.status === 'ok').length} OK, ${checks.filter((c) => c.status === 'warning').length} warnings, ${checks.filter((c) => c.status === 'fail').length} fails`,
  })
}
