import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInactive, type MemberRole } from '@/lib/auth/inactivity'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const path = request.nextUrl.pathname

  // Récupérer l'utilisateur — ne JAMAIS rediriger vers /login si erreur réseau
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return response
  }

  const isDashboardRoute = path.startsWith('/dashboard')
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/')
  const needsAuth = isDashboardRoute || isAdminRoute

  if (needsAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Pour les routes authentifiées, on lit le profil (role + last_visit_at)
  // pour décider de l'expiration et du droit admin.
  if (needsAuth && user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, last_visit_at')
        .eq('id', user.id)
        .single()

      if (isAdminRoute && profile?.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Expiration par inactivité — admin strict (défaut 30 min),
      // membre souple (défaut 7 j). Voir docs/SESSION_SECURITY_POLICY.md.
      const role: MemberRole = profile?.role === 'admin' ? 'admin' : 'member'
      if (isInactive(profile?.last_visit_at ?? null, role)) {
        // On ne déconnecte pas en dur ici (pas de cookie clearing côté proxy)
        // — on route vers /login?expired=1 qui se charge du sign-out.
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('expired', '1')
        url.searchParams.set('next', path)
        const redirect = NextResponse.redirect(url)
        // Invalide les cookies sb-* pour forcer un vrai sign-out.
        for (const c of request.cookies.getAll()) {
          if (c.name.startsWith('sb-')) {
            redirect.cookies.set(c.name, '', { maxAge: 0, path: '/' })
          }
        }
        return redirect
      }
    } catch {
      // Erreur réseau sur la vérif profil → laisser passer
      return response
    }
  }

  // Si user déjà connecté visite /login ou /register → renvoyer au dashboard
  // (sauf si on arrive avec expired=1, cas où on vient justement d'être kické)
  if (user && (path === '/login' || path === '/register')) {
    if (request.nextUrl.searchParams.get('expired') === '1') return response
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     * - _next/static, _next/image, favicon.ico
     * - fichiers statiques (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
