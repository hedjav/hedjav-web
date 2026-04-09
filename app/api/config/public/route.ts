import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const keys = request.nextUrl.searchParams.get('keys')?.split(',') || []
  if (!keys.length) return NextResponse.json({})
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data } = await db.from('site_config').select('key, value').in('key', keys)
  const config: Record<string, string> = {}
  data?.forEach(row => { config[row.key] = row.value })
  return NextResponse.json(config)
}
