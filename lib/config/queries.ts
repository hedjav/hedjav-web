import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function getConfig(key: string): Promise<string | null> {
  const { data } = await adminClient()
    .from('site_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

export async function getConfigsByCategory(
  category: string,
): Promise<Record<string, string>> {
  const { data } = await adminClient()
    .from('site_config')
    .select('key, value')
    .eq('category', category)
    .order('key')
  const result: Record<string, string> = {}
  for (const row of data ?? []) {
    result[row.key] = row.value
  }
  return result
}

export async function getAllConfigs(): Promise<
  Record<
    string,
    Record<string, { value: string; label: string; type: string; description: string }>
  >
> {
  const { data } = await adminClient()
    .from('site_config')
    .select('key, value, type, category, label, description')
    .order('category')
    .order('key')

  const result: Record<
    string,
    Record<string, { value: string; label: string; type: string; description: string }>
  > = {}

  for (const row of data ?? []) {
    const cat = row.category ?? 'general'
    if (!result[cat]) result[cat] = {}
    result[cat][row.key] = {
      value: row.value,
      label: row.label ?? row.key,
      type: row.type ?? 'text',
      description: row.description ?? '',
    }
  }
  return result
}

export async function updateConfig(
  key: string,
  value: string,
  updatedBy?: string,
): Promise<void> {
  const { error } = await adminClient()
    .from('site_config')
    .update({ value, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null })
    .eq('key', key)
  if (error) throw new Error(error.message)
}
