/**
 * Générateur d'articles BRVM via Claude API.
 * Utilise les données scrappées pour rédiger un article d'analyse.
 */

import { generateText } from '@/lib/claude/client'
import type { BRVMIndex, BRVMNews } from './scraper'

type GeneratedArticle = {
  title: string
  excerpt: string
  body: string
  category: string
}

export async function generateBRVMArticle(
  indices: { date: string; indices: BRVMIndex[] },
  news: BRVMNews[],
): Promise<GeneratedArticle> {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const indicesText = indices.indices.length > 0
    ? indices.indices.map((i) => `- ${i.name} : ${i.value} (${i.variation})`).join('\n')
    : 'Données non disponibles'

  const newsText = news.length > 0
    ? news.map((n) => `- ${n.title}${n.summary ? ` : ${n.summary}` : ''}`).join('\n')
    : 'Aucune actualité récente'

  const prompt = `Tu rédiges un article d'analyse boursière BRVM pour egp.hedjav.com.
Style professionnel mais accessible, en français, pour un public UEMOA.

Date : ${today}
Date des données : ${indices.date}

## Indices du jour
${indicesText}

## Actualités récentes
${newsText}

Rédige un article complet en markdown avec :
1. Un titre accrocheur (une seule ligne, sans #)
2. Une introduction contextualisant la séance
3. Analyse des indices (tendances, volumes, points remarquables)
4. Points clés des actualités si disponibles
5. Perspective et éléments à surveiller

Le titre doit être sur la première ligne, suivi d'une ligne vide, puis le corps de l'article.
L'article doit faire entre 400 et 800 mots.
Ne pas inclure de disclaimers légaux dans le texte.`

  const result = await generateText({
    system: 'Tu es un analyste financier spécialisé sur la BRVM et les marchés UEMOA. Tu rédiges pour le site egp.hedjav.com, école en ligne de gestion de patrimoine.',
    prompt,
    maxTokens: 2048,
  })

  if (!result.ok) {
    // Fallback : article placeholder avec données brutes
    console.warn('[brvm-article] Génération Claude échouée, fallback données brutes:', result.error)
    return buildFallbackArticle(indices, news, today)
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
  indices: { date: string; indices: BRVMIndex[] },
  news: BRVMNews[],
  today: string,
): GeneratedArticle {
  const indicesList = indices.indices.length > 0
    ? indices.indices.map((i) => `- **${i.name}** : ${i.value} (${i.variation})`).join('\n')
    : '*Données indices non disponibles*'

  const newsList = news.length > 0
    ? news.map((n) => `- [${n.title}](${n.url})`).join('\n')
    : '*Aucune actualité disponible*'

  const body = `
Voici le récapitulatif de la séance BRVM du ${indices.date}.

## Indices

${indicesList}

## Actualités

${newsList}

---

*Article généré automatiquement. Analyse détaillée à venir.*
`.trim()

  return {
    title: `BRVM — Point de marché du ${today}`,
    excerpt: `Récapitulatif de la séance BRVM du ${indices.date}. Indices et actualités du jour.`,
    body,
    category: 'BRVM',
  }
}
