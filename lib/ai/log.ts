import { createClient } from '@supabase/supabase-js'

type LogData = {
  action: string
  prompt?: string
  result?: string
  model?: string
  tokens_used?: number
  duration_ms?: number
  status: 'success' | 'error'
  error_message?: string
  created_by?: string
}

export async function logAiCall(data: LogData) {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { error } = await db.from('ai_logs').insert({
      action: data.action,
      prompt: data.prompt ?? null,
      result: data.result ?? null,
      model: data.model ?? 'claude-sonnet-4-20250514',
      tokens_used: data.tokens_used ?? null,
      duration_ms: data.duration_ms ?? null,
      status: data.status,
      error_message: data.error_message ?? null,
      created_by: data.created_by ?? null,
    })

    if (error) console.error('[ai_logs] insert failed', error)
  } catch (e) {
    console.error('[ai_logs] unexpected error', e)
  }
}
