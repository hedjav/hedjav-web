#!/usr/bin/env node
/**
 * Seed pages institutionnelles dans Supabase.
 * Prérequis : migration 005_pages.sql exécutée.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('❌ Missing env')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const pages = [
  {
    slug: 'a-propos',
    title: 'À propos de Hedjav',
    cover_image_url: '/DSC_0010 copy.jpeg',
    meta_description:
      "Hedjav, c'est l'expertise patrimoniale de Hermann D. AVAHOUIN au service des particuliers et entrepreneurs d'Afrique francophone.",
    body: `## L'histoire derrière Hedjav

Hedjav est né d'un constat simple : en Afrique francophone, l'accès à un conseil patrimonial **indépendant, compétent et adapté aux réalités locales** reste rare. Trop rare.

D'un côté, des banques qui vendent leurs propres produits. De l'autre, des contenus financiers occidentaux totalement déconnectés du contexte UEMOA. Au milieu, des cadres, entrepreneurs et familles qui veulent bâtir leur patrimoine sans savoir par où commencer.

Hedjav comble ce vide.

## Hermann D. AVAHOUIN — Le fondateur

**13 ans d'expérience dans la finance ouest-africaine.**

Analyste financier de formation, Hermann a passé plus d'une décennie au sein de **Bank of Africa Bénin (BOA)**, où il a accompagné des centaines de clients sur des sujets de financement, d'investissement et de gestion de patrimoine.

Aujourd'hui, à la tête de **KTALYZ Conseils**, il met cette expertise au service direct des particuliers et entrepreneurs francophones, à travers :

- Du conseil patrimonial sur-mesure
- Des formations pratiques (BRVM, immobilier, structuration patrimoniale)
- Des publications accessibles (ebooks, articles, newsletter)

## Notre vision

> Démocratiser une expertise patrimoniale jusqu'ici réservée à une élite, en l'ancrant dans les réalités fiscales, économiques et culturelles du continent.

Concrètement, cela veut dire :

1. **Du contenu en français**, pas une traduction approximative d'articles US
2. **Des exemples chiffrés en FCFA**, pas en euros ou en dollars
3. **Un cadre juridique OHADA**, pas un mode d'emploi américain qui ne s'applique nulle part chez nous
4. **Des stratégies testées sur le terrain**, par des praticiens, pas par des universitaires

## Pourquoi maintenant ?

Trois raisons :

**1. La classe moyenne ouest-africaine explose.** En 10 ans, le nombre de cadres, entrepreneurs et indépendants disposant d'un revenu stable a doublé en zone UEMOA. Tous ces profils ont besoin d'outils concrets pour faire fructifier leur argent.

**2. La BRVM se démocratise.** Les SGI proposent désormais des plateformes en ligne. Les frais baissent. Le ticket d'entrée n'a jamais été aussi accessible. Mais l'information reste opaque.

**3. L'IA change la donne.** Les nouveaux outils permettent de produire un contenu de qualité, à grande échelle, sans sacrifier la profondeur. Hedjav exploite cette opportunité pour publier plus, plus vite, plus précis.

## Ce que vous trouverez sur Hedjav

- 📚 **Des ebooks** prêts à l'emploi sur les sujets clés (BRVM, patrimoine, IA appliquée à la finance, immobilier locatif…)
- ✍️ **Un blog** avec des analyses, guides et études de cas
- 📧 **Une newsletter** pour ne rien manquer
- 💼 **Un espace membre** pour gérer vos achats et accéder à votre bibliothèque

## Contact

Pour toute question, partenariat ou demande de conseil :
- Email : [hedjav@gmail.com](mailto:hedjav@gmail.com)
- WhatsApp : [+229 01 97 89 03 63](https://wa.me/22901978903630)

Nous lisons et répondons à chaque message.
`,
  },
]

async function main() {
  console.log(`→ Seeding ${pages.length} pages…`)
  const { data, error } = await supabase
    .from('pages')
    .upsert(pages, { onConflict: 'slug' })
    .select('slug, title')
  if (error) {
    console.error('❌', error.message)
    process.exit(1)
  }
  for (const r of data ?? []) console.log(`  ✓ ${r.slug}`)
  console.log('✅ Done')
}
main()
