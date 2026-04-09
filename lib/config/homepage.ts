import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getHomepageConfig(): Promise<Record<string, string>> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('site_config')
      .select('key, value')
      .eq('category', 'homepage')
    const config: Record<string, string> = {}
    data?.forEach((row) => {
      config[row.key] = row.value
    })
    return config
  } catch {
    // Si la table n'existe pas encore ou erreur réseau, on retourne un objet vide
    // et les composants utiliseront leurs fallbacks
    return {}
  }
}
