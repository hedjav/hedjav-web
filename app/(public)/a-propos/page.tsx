import type { Metadata } from 'next'
import Image from 'next/image'
import { getPageBySlug } from '@/lib/pages/queries'
import { ArticleBody } from '@/components/features/ArticleBody'

export const revalidate = 300

// Fallback si la table pages n'existe pas encore ou si /a-propos n'a pas été seed.
const FALLBACK = {
  title: 'À propos de Hedjav',
  cover_image_url: "/DSC_0010 copy.jpeg",
  meta_description:
    "Hedjav, c'est l'expertise patrimoniale de Hermann D. AVAHOUIN au service des particuliers et entrepreneurs d'Afrique francophone.",
  body: `## L'histoire derrière Hedjav

Hedjav est né d'un constat simple : en Afrique francophone, l'accès à un conseil patrimonial **indépendant, compétent et adapté aux réalités locales** reste rare. Trop rare.

D'un côté, des banques qui vendent leurs propres produits. De l'autre, des contenus financiers occidentaux totalement déconnectés du contexte UEMOA. Au milieu, des cadres, entrepreneurs et familles qui veulent bâtir leur patrimoine sans savoir par où commencer.

Hedjav comble ce vide.

## Hermann D. AVAHOUIN — Le fondateur

**13 ans d'expérience dans la finance ouest-africaine.**

Analyste financier de formation, Hermann a passé plus d'une décennie au sein de **Bank of Africa Bénin (BOA)**, où il a accompagné des centaines de clients sur des sujets de financement, d'investissement et de gestion de patrimoine.

Aujourd'hui, à la tête de **KTALYZ Conseils**, il met cette expertise au service direct des particuliers et entrepreneurs francophones, à travers du conseil patrimonial sur-mesure, des formations pratiques (BRVM, immobilier, structuration patrimoniale) et des publications accessibles.

## Notre vision

> Démocratiser une expertise patrimoniale jusqu'ici réservée à une élite, en l'ancrant dans les réalités fiscales, économiques et culturelles du continent.

Concrètement :

- **Du contenu en français**, pas une traduction d'articles US
- **Des exemples chiffrés en FCFA**
- **Un cadre juridique OHADA**
- **Des stratégies testées sur le terrain**

## Ce que vous trouverez sur Hedjav

- 📚 Des **ebooks** prêts à l'emploi (BRVM, patrimoine, IA appliquée à la finance, immobilier locatif…)
- ✍️ Un **blog** avec analyses, guides et études de cas
- 📧 Une **newsletter** pour ne rien manquer
- 💼 Un **espace membre** pour gérer vos achats et accéder à votre bibliothèque

## Contact

- Email : [hedjav@gmail.com](mailto:hedjav@gmail.com)
- WhatsApp : [+229 01 97 89 03 63](https://wa.me/22901978903630)

Nous lisons et répondons à chaque message.
`,
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('a-propos').catch(() => null)
  return {
    title: page?.title ?? FALLBACK.title,
    description: page?.meta_description ?? FALLBACK.meta_description,
  }
}

export default async function AProposPage() {
  // Tente de lire depuis Supabase. Si la table n'existe pas ou si la page n'a
  // pas été seed, on retombe sur le fallback hardcodé pour ne jamais 404.
  const page = await getPageBySlug('a-propos').catch(() => null)
  const content = page ?? FALLBACK

  return (
    <article className="section">
      <div className="hedjav-container" style={{ maxWidth: 800 }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--s12)' }}>
          {content.cover_image_url && (
            <div
              style={{
                position: 'relative',
                width: 220,
                height: 220,
                borderRadius: 'var(--rfull)',
                overflow: 'hidden',
                margin: '0 auto var(--s8)',
                boxShadow: 'var(--shc)',
                border: '4px solid var(--g500)',
              }}
            >
              <Image
                src={content.cover_image_url}
                alt={content.title}
                fill
                sizes="220px"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                priority
              />
            </div>
          )}
          <span className="eyebrow">Hedjav</span>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s4)',
              fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))',
            }}
          >
            {content.title}
          </h1>
          {content.meta_description && (
            <p
              style={{
                marginTop: 'var(--s5)',
                color: 'var(--muted)',
                fontSize: 'var(--text-lg)',
                maxWidth: 640,
                marginInline: 'auto',
              }}
            >
              {content.meta_description}
            </p>
          )}
        </header>

        <ArticleBody markdown={content.body} />
      </div>
    </article>
  )
}
