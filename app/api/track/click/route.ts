import { NextRequest, NextResponse } from 'next/server'
import { updateSendStatus } from '@/lib/campaigns/queries'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const url = request.nextUrl.searchParams.get('url')

  if (id) {
    updateSendStatus(id, 'clicked', new Date().toISOString()).catch(() => {})
  }

  const target = url ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'
  return NextResponse.redirect(target, 302)
}
