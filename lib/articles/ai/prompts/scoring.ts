import { composeArticleSystem } from './_system'
import { parseJsonLoose } from './parse'

export const SCORING_PROMPT_VERSION = 'articles/scoring@v1'

export type ArticleScoringResult = {
  score_100: number
  breakdown: {
    pertinence_uemoa: number
    redactionnel: number
    seo: number
    donnees_chiffrees: number
    appel_action: number
  }
  feedback: string
}

export function buildScoringPrompt(article: {
  title: string
  category: string | null
  body: string
}): { system: string; prompt: string } {
  const system = composeArticleSystem(`
Tu notes un article déjà rédigé sur 5 critères, chacun noté sur 20 :

- **pertinence_uemoa** : contexte UEMOA concret (pays, FCFA, BRVM, OHADA, BCEAO) ?
- **redactionnel** : clarté, densité, absence de remplissage, ton Hedjav ?
- **seo** : sous-titres porteurs de mots-clés, longueur suffisante, structure lisible ?
- **donnees_chiffrees** : l'article cite-t-il des chiffres, pourcentages, exemples concrets ?
- **appel_action** : l'article laisse-t-il le lecteur avec une piste concrète à appliquer ?

Sortie attendue : **JSON strict** (pas de fence ni de texte hors JSON) :

{
  "score_100": <entier 0-100>,
  "breakdown": {
    "pertinence_uemoa": <0-20>,
    "redactionnel": <0-20>,
    "seo": <0-20>,
    "donnees_chiffrees": <0-20>,
    "appel_action": <0-20>
  },
  "feedback": "Phrase unique, actionnable (≤200 caractères), sur le principal point à améliorer"
}

Le \`score_100\` DOIT être exactement la somme des cinq critères.
`)

  const truncated = article.body.slice(0, 4000)
  const prompt = `TITRE : ${article.title}
CATÉGORIE : ${article.category ?? 'non spécifiée'}

CORPS (tronqué à 4000 caractères) :
${truncated}

TÂCHE : Évalue l'article et retourne le JSON strict indiqué. Rien d'autre.`

  return { system, prompt }
}

export function parseScoringResponse(raw: string): ArticleScoringResult | null {
  const parsed = parseJsonLoose<unknown>(raw)
  if (!parsed || typeof parsed !== 'object') return null
  const r = parsed as Record<string, unknown>
  const b = (r.breakdown ?? {}) as Record<string, unknown>
  const crit = {
    pertinence_uemoa: clamp(b.pertinence_uemoa, 20),
    redactionnel: clamp(b.redactionnel, 20),
    seo: clamp(b.seo, 20),
    donnees_chiffrees: clamp(b.donnees_chiffrees, 20),
    appel_action: clamp(b.appel_action, 20),
  }
  const sum = crit.pertinence_uemoa + crit.redactionnel + crit.seo + crit.donnees_chiffrees + crit.appel_action
  const score_100 = typeof r.score_100 === 'number' ? clamp(r.score_100, 100) : sum
  return {
    score_100,
    breakdown: crit,
    feedback: typeof r.feedback === 'string' ? r.feedback.slice(0, 240) : '',
  }
}

function clamp(value: unknown, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(max, Math.round(n)))
}
