import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/media/upload
 * Multipart/form-data with a "file" field.
 * Protected by admin session.
 */
export async function POST(request: Request) {
  // Auth check
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

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Limite de taille : 10 Mo
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` },
      { status: 413 },
    )
  }

  // Types autorisés : images et PDF uniquement
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Type de fichier non autorisé : ${file.type}. Types acceptés : images, PDF.` },
      { status: 415 },
    )
  }

  // Bloquer les extensions dangereuses même si le MIME est truqué
  const BLOCKED_EXTENSIONS = ['.exe', '.php', '.sh', '.bat', '.cmd', '.ps1', '.msi', '.dll', '.js', '.vbs']
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : ''
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Extension de fichier interdite : ${ext}` },
      { status: 415 },
    )
  }

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  const path = `${timestamp}_${safeName}`

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const buffer = await file.arrayBuffer()
  const { error } = await db.storage.from('media').upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`

  return NextResponse.json({ url, name: path })
}
