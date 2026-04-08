import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/signout
 *
 * Approche brute-force : supprime explicitement TOUS les cookies sb-* dans
 * la réponse, peu importe ce que fait Supabase en interne. Garantit que la
 * session est cassée immédiatement, même si @supabase/ssr a un quirk
 * d'écriture des cookies dans certains contextes.
 */
export async function POST() {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()

  const response = NextResponse.json({ ok: true })

  for (const c of all) {
    if (c.name.startsWith('sb-')) {
      response.cookies.set(c.name, '', {
        maxAge: 0,
        path: '/',
      })
    }
  }

  return response
}
