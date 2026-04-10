/**
 * Generateur d'articles BRVM via Claude API.
 * Utilise les donnees scrappees pour rediger un article d'analyse.
 */

import { generateText } from '@/lib/claude/client'
import type { ResumeSeance, IndiceData, Annonce } from './scraper'

type GeneratedArticle = {
  title: string
  excerpt: string
  body: string
  category: string
}

export async function generateBRVMArticle(
  resume: ResumeSeance | null,
  indices: IndiceData[],
  annonces: Annonce[],
): Promise<GeneratedArticle> {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const indicesText = indices.length > 0
    ? indices.map((i) => `- ${i.name} : ${i.value} (${i.variation})`).join('\n')
    : 'Donnees non disponibles'

  const topText = resume?.top5?.length
    ? resume.top5.map((t) => `- ${t.ticker} (${t.nom}) : ${t.variation}`).join('\n')
    : 'Non disponibles'

  const flopText = resume?.flop5?.length
    ? resume.flop5.map((t) => `- ${t.ticker} (${t.nom}) : ${t.variation}`).join('\n')
    : 'Non disponibles'

  const annoncesText = annonces.length > 0
    ? annonces.slice(0, 5).map((n) => `- ${n.title}${n.emetteur ? ` (${n.emetteur})` : ''}`).join('\n')
    : 'Aucune annonce recente'

  const prompt = `Tu rediges un article d'analyse boursiere BRVM pour egp.hedjav.com.
Style professionnel mais accessible, en francais, pour un public UEMOA.

Date : ${today}
Date des donnees : ${resume?.date ?? today}

## Indices du jour
${indicesText}

## Top hausses
${topText}

## Top baisses
${flopText}

## Annonces recentes
${annoncesText}

## Donnees cles
- Valeur des transactions : ${resume?.valeur_transactions ?? 'N/A'}
- Capitalisation actions : ${resume?.cap_actions ?? 'N/A'}

Redige un article complet en markdown avec :
1. Un titre accrocheur (une seule ligne, sans #)
2. Une introduction contextualisant la seance
3. Analyse des indices (tendances, volumes, points remarquables)
4. Points cles des actualites si disponibles
5. Perspective et elements a surveiller

Le titre doit etre sur la premiere ligne, suivi d'une ligne vide, puis le corps de l'article.
L'article doit faire entre 400 et 800 mots.
Ne pas inclure de disclaimers legaux dans le texte.`

  const result = await generateText({
    system: 'Tu es un analyste financier specialise sur la BRVM et les marches UEMOA. Tu rediges pour le site egp.hedjav.com, ecole en ligne de gestion de patrimoine.',
    prompt,
    maxTokens: 2048,
  })

  if (!result.ok) {
    console.warn('[brvm-article] Generation Claude echouee, fallback donnees brutes:', result.error)
    return buildFallbackArticle(resume, indices, annonces, today)
  }

  const lines = result.text.trim().split('\n')
  const title = lines[0].replace(/^#+\s*/, '').trim()
  const body = lines.slice(1).join('\n').trim()
  const excerpt = body.slice(0, 200).replace(/\n/g, ' ').trim() + '...'

  return {
    title,
    excerpt,
    body,
    category: 'BRVM',
  }
}

function buildFallbackArticle(
  resume: ResumeSeance | null,
  indices: IndiceData[],
  annonces: Annonce[],
  today: string,
): GeneratedArticle {
  const indicesList = indices.length > 0
    ? indices.map((i) => `- **${i.name}** : ${i.value} (${i.variation})`).join('\n')
    : '*Donnees indices non disponibles*'

  const annoncesList = annonces.length > 0
    ? annonces.slice(0, 5).map((n) => `- ${n.title}`).join('\n')
    : '*Aucune annonce disponible*'

  const body = `
Voici le recapitulatif de la seance BRVM du ${resume?.date ?? today}.

## Indices

${indicesList}

## Annonces

${annoncesList}

---

*Article genere automatiquement. Analyse detaillee a venir.*
`.trim()

  return {
    title: `BRVM — Point de marche du ${today}`,
    excerpt: `Recapitulatif de la seance BRVM du ${resume?.date ?? today}. Indices et actualites du jour.`,
    body,
    category: 'BRVM',
  }
}
