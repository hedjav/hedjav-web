import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { updateConfig } from '@/lib/config/queries'

/**
 * POST /api/admin/config
 * Body: FormData with keys like config__<key>
 * Protected by admin session.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const entries = Array.from(formData.entries())

  for (const [key, value] of entries) {
    if (key.startsWith('config__')) {
      const configKey = key.replace('config__', '')
      await updateConfig(configKey, String(value), profile.email)
    }
  }

  return NextResponse.json({ ok: true })
}
