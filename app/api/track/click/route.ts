import { NextRequest, NextResponse } from 'next/server'
import { updateSendStatus } from '@/lib/campaigns/queries'
import { siteBase } from '@/lib/url'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const url = request.nextUrl.searchParams.get('url')

  if (id) {
    updateSendStatus(id, 'clicked', new Date().toISOString()).catch(() => {})
  }

  const appUrl = siteBase()

  // Sécurité : restreindre les redirections au domaine hedjav uniquement
  let target = appUrl
  if (url) {
    try {
      const parsed = new URL(url)
      const appHost = new URL(appUrl).hostname
      if (parsed.hostname === appHost || parsed.hostname.endsWith(`.${appHost}`)) {
        target = url
      }
      // Toute URL externe est ignorée → redirige vers la homepage
    } catch {
      // URL invalide → redirige vers la homepage
    }
  }

  return NextResponse.redirect(target, 302)
}
