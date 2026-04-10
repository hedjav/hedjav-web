import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/create-member
 * Body: { email, full_name }
 * Protected by admin session.
 * Creates a new user with admin role via service_role.
 */
export async function POST(request: Request) {
  // Verify admin session
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

  let body: { email?: string; full_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim()
  const full_name = body.full_name?.trim()

  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  if (!full_name) return NextResponse.json({ error: 'Nom complet requis' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Create user via admin API (sends confirmation email automatically)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Insert/upsert profile as admin
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: newUser.user.id,
        email,
        full_name,
        role: 'admin',
      },
      { onConflict: 'id' },
    )

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
