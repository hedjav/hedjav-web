/**
 * Seed : première campagne "Bienvenue IA" avec 5 emails.
 * Usage : node scripts/seed-first-campaign.mjs
 * Nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local manually (no dotenv dependency)
const envFile = readFileSync('.env.local', 'utf-8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].replace(/\r$/, '').trim()
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const EMAILS = [
  { position: 1, delay_days: 0, subject: 'Bienvenue ! Voici ton guide gratuit', body_prompt: 'Email de bienvenue pour un nouvel abonné intéressé par l\'IA appliquée à la finance. Offre le guide gratuit. Ton chaleureux, tutoiement.' },
  { position: 2, delay_days: 2, subject: '3 prompts qui ont changé ma productivité', body_prompt: 'Partage 3 prompts concrets ChatGPT pour analyser ses finances personnelles. Exemples en FCFA. Résultats avant/après.' },
  { position: 3, delay_days: 5, subject: 'Ce que nos lecteurs en disent', body_prompt: 'Témoignages de lecteurs Hedjav sur leurs résultats. Social proof. Ton authentique, références UEMOA.' },
  { position: 4, delay_days: 7, subject: "L'ebook complet à 4 900 FCFA (au lieu de 15 000)", body_prompt: 'Offre promotionnelle sur l\'ebook IA. Bénéfices concrets. Urgence douce. CTA vers la page de vente.' },
  { position: 5, delay_days: 10, subject: 'Dernière chance — récap des bénéfices', body_prompt: 'Dernier email de la séquence. Récap des bénéfices. Dernière chance d\'acheter à prix réduit. CTA final.' },
]

async function seed() {
  console.log('Création de la campagne "Bienvenue IA"...')

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .insert({
      name: 'Bienvenue IA',
      type: 'welcome_sequence',
      target_tags: ['ia'],
      status: 'draft',
      created_by: 'seed-script',
    })
    .select('id')
    .single()

  if (campErr) {
    console.error('Erreur création campagne:', campErr.message)
    process.exit(1)
  }

  console.log(`Campagne créée : ${campaign.id}`)

  for (const email of EMAILS) {
    const { error } = await supabase.from('campaign_emails').insert({
      campaign_id: campaign.id,
      ...email,
    })
    if (error) {
      console.error(`Erreur email #${email.position}:`, error.message)
    } else {
      console.log(`  Email #${email.position} : ${email.subject}`)
    }
  }

  console.log('\nCampagne seedée avec succès.')
  console.log('Pour activer : /admin/campagnes → modifier le statut en "active"')
  console.log('Pour générer le contenu IA : cliquer "Générer IA" sur chaque email dans /admin/campagnes/' + campaign.id)
}

seed()
