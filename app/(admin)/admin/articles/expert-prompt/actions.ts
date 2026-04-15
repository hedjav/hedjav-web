'use server'

import { revalidatePath } from 'next/cache'
import { updateConfig } from '@/lib/config/queries'
import { invalidateExpertPromptCache } from '@/lib/articles/ai/expert-prompt'
import { requireAdmin } from '@/lib/auth/session'

export async function saveExpertPromptAction(formData: FormData) {
  const profile = await requireAdmin()
  const raw = String(formData.get('prompt') ?? '')
  await updateConfig('articles_expert_prompt', raw.trim(), profile.email ?? 'admin')
  invalidateExpertPromptCache()
  revalidatePath('/admin/articles/expert-prompt')
}
