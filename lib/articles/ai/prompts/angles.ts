import { composeArticleSystem } from './_system'
import { parseJsonLoose } from './parse'
import type { ArticleAngle } from '../../types'
import type { ArticleContext } from '../context'

export const ANGLES_PROMPT_VERSION = 'articles/angles@v1'

export function buildAnglesPrompt(
  ctx: ArticleContext,
  expertPrompt: string | null = null,
): { system: string; prompt: string } {
  const system = composeArticleSystem(`
Tu proposes **5 à 8 angles éditoriaux distincts** pour un article de blog.
Chaque angle doit être concret, actionnable, et suffisamment différencié pour
ne pas se recouper avec les autres.

Sortie attendue : **JSON strict** (pas de markdown fence), tableau d'objets :

[
  {
    "id": "slug-court-kebab",
    "angle": "Formulation de l'angle en 1 phrase (≤140 caractères)",
    "audience": "À qui cet angle parle-t-il en priorité ?",
    "why_now": "Pourquoi c'est pertinent maintenant (saison, actualité, événement)"
  }
]

Règles :
- Pas plus de 8 angles. Si le sujet est étroit, 5 suffisent.
- Pas d'angle redondant. Varier audience (particulier / entrepreneur / CGP / investisseur actions), horizon (court / long), niveau (initié / averti).
- Pas de chiffre inventé dans \`why_now\`.
`, expertPrompt)

  const prompt = buildUserPrompt(ctx, `TÂCHE : Propose 5 à 8 angles distincts au format JSON strict. Rien d'autre.`)
  return { system, prompt }
}

export function parseAnglesResponse(raw: string): ArticleAngle[] {
  const parsed = parseJsonLoose<unknown>(raw)
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item): ArticleAngle | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      if (typeof r.angle !== 'string') return null
      return {
        id: typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 60) : slugify(r.angle),
        angle: r.angle.slice(0, 200),
        audience: typeof r.audience === 'string' ? r.audience.slice(0, 140) : '',
        why_now: typeof r.why_now === 'string' ? r.why_now.slice(0, 200) : '',
      }
    })
    .filter((a): a is ArticleAngle => a !== null)
    .slice(0, 8)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function buildUserPrompt(ctx: ArticleContext, task: string): string {
  const parts: string[] = []
  if (ctx.subject) parts.push(`SUJET LIBRE : ${ctx.subject}`)
  if (ctx.category) parts.push(`CATÉGORIE PRESSENTIE : ${ctx.category}`)
  if (ctx.brvm_summary) parts.push(`CONTEXTE BRVM :\n${ctx.brvm_summary}`)
  if (ctx.instructions) parts.push(`INSTRUCTIONS COMPLÉMENTAIRES : ${ctx.instructions}`)
  parts.push(task)
  return parts.join('\n\n')
}

export { buildUserPrompt as _buildUserPromptShared }
