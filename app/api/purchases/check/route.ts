import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/purchases/check?ebook_id=XXX
 *
 * Vérifie si l'utilisateur connecté a déjà acheté un ebook.
 * 401 si non connecté — { purchased: boolean } sinon.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ebookId = searchParams.get('ebook_id')

  if (!ebookId) {
    return NextResponse.json({ error: 'Missing ebook_id' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('ebook_id', ebookId)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ purchased: !!data })
}
