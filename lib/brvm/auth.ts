import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Vérifie le header Authorization Bearer INTERNAL_API_TOKEN.
 * Retourne null si OK, une NextResponse 401 sinon.
 */
export function checkInternalToken(request: Request): NextResponse | null {
  const token = process.env.INTERNAL_API_TOKEN
  const auth = request.headers.get('authorization') ?? ''
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Vérifie que l'utilisateur courant est admin (session Supabase).
 * Retourne null + { userId } si OK, ou une NextResponse 401/403 sinon.
 * À utiliser dans les routes API qui doivent renvoyer JSON (pas redirect).
 */
export async function checkAdminSession(): Promise<
  { response: NextResponse; userId: null } | { response: null; userId: string }
> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      userId: null,
    }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      userId: null,
    }
  }
  return { response: null, userId: user.id }
}
