/**
 * Seed : sequence de bienvenue Hedjav (EGP) — 5 emails sur 12 jours.
 *
 * Ton : direct, credible, UEMOA, 13 ans d'experience.
 * Objectif : capter l'attention, livrer de la valeur concrete,
 *            convertir vers le premier ebook.
 *
 * Usage : node scripts/seed-first-campaign.mjs
 * Necessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
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
  {
    position: 1,
    delay_days: 0,
    subject: 'Bienvenue dans la communaute Hedjav',
    body_prompt:
      "Email de bienvenue pour un nouvel abonne de l'Ecole en ligne de la Gestion de Patrimoine (EGP), marque Hedjav. " +
      "Contexte : l'abonne vient de s'inscrire, on ne connait rien de lui a part son email. " +
      "Objectif : 1) lui confirmer son inscription, 2) presenter rapidement Hermann (13 ans d'experience bancaire UEMOA, fondateur KTALYZ), " +
      "3) dire ce qu'il va recevoir chaque semaine (analyses BRVM, guides patrimoniaux UEMOA, decryptage IA), " +
      "4) lui donner un premier conseil pratique (ex : une regle simple d'epargne ou un principe patrimonial). " +
      "Ton : direct, chaleureux, credible. Pas de jargon marketing. Tutoiement. Signature : Hermann D. AVAHOUIN.",
  },
  {
    position: 2,
    delay_days: 2,
    subject: 'La plus grande erreur que je vois en UEMOA depuis 13 ans',
    body_prompt:
      "Email #2 d'une sequence de bienvenue Hedjav. Objectif : installer la credibilite et creer un moment utilite forte. " +
      "Raconter une erreur patrimoniale tres courante chez les cadres/entrepreneurs UEMOA : concentrer 90% de son patrimoine dans une seule maison. " +
      "Expliquer pourquoi c'est un risque (illiquidite, concentration), donner 2 alternatives concretes (actions BRVM, epargne de precaution). " +
      "Finir par une question : 'Dans quelle situation es-tu aujourd'hui ?' avec un lien vers l'article sur les 5 erreurs patrimoniales. " +
      "Ton : experience vecue, exemples chiffres en FCFA, pas de ton donneur de lecons.",
  },
  {
    position: 3,
    delay_days: 5,
    subject: 'BRVM : 3 choses a savoir avant ton premier ordre',
    body_prompt:
      "Email #3 Hedjav. Objectif : donner de la valeur sur la BRVM et positionner EGP comme ressource de reference. " +
      "3 points : 1) tu ouvres un compte chez une SGI, pas 'a la BRVM' directement, 2) les commissions peuvent manger ta performance, " +
      "3) un ordre 'a cours limite' est plus sur qu'un 'au marche' sur nos titres peu liquides. " +
      "Pour chaque point, 2-3 lignes d'explication. CTA : lien vers l'article complet sur l'ouverture de compte-titres BRVM. " +
      "Ton : expert mais accessible, pas de jargon. Tutoiement.",
  },
  {
    position: 4,
    delay_days: 8,
    subject: "L'ebook qui regroupe tout ce que j'ai appris en 13 ans",
    body_prompt:
      "Email #4 de la sequence. Objectif : presenter l'ebook IA phare (300+ prompts, framework C-A-F-E) " +
      "comme la premiere marche concrete pour les abonnes interesses par la productivite et la prise de decision. " +
      "Expliquer ce que l'ebook apporte (prompts prets a l'emploi, cas UEMOA, FCFA), a qui il s'adresse " +
      "(entrepreneurs, cadres, freelances), et pourquoi c'est different d'une simple liste de prompts. " +
      "Prix : 4 900 FCFA, livraison instantanee dans l'espace membre. CTA clair vers la page de vente. " +
      "Pas d'urgence artificielle. Ton : confiant, pas pushy.",
  },
  {
    position: 5,
    delay_days: 12,
    subject: 'Ce que tu peux faire des demain avec Hedjav',
    body_prompt:
      "Email #5 — dernier de la sequence de bienvenue. Objectif : recapituler et poser le long terme. " +
      "Rappeler les 3 canaux Hedjav : (1) newsletter hebdo, (2) blog EGP avec articles patrimoniaux et BRVM, " +
      "(3) catalogue d'ebooks pratiques. Inviter a repondre a cet email avec ses propres questions patrimoniales. " +
      "Terminer sur la vision EGP : faire emerger une veritable culture patrimoniale en Afrique francophone. " +
      "Ton : personnel, engage, humain. Signature Hermann.",
  },
]

async function seed() {
  console.log('Creation de la campagne "Bienvenue Hedjav"...')

  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('name', 'Bienvenue Hedjav')
    .maybeSingle()

  if (existing) {
    console.log(`Campagne existante detectee (${existing.id}). Mise a jour des emails.`)
    // On supprime les anciens emails et on re-insere
    await supabase.from('campaign_emails').delete().eq('campaign_id', existing.id)
    for (const email of EMAILS) {
      const { error } = await supabase.from('campaign_emails').insert({
        campaign_id: existing.id,
        ...email,
      })
      if (error) console.error(`Erreur email #${email.position}:`, error.message)
      else console.log(`  Email #${email.position} : ${email.subject}`)
    }
    console.log('\nCampagne mise a jour avec succes.')
    return
  }

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .insert({
      name: 'Bienvenue Hedjav',
      type: 'welcome_sequence',
      target_tags: ['newsletter', 'editorial'],
      status: 'draft',
      created_by: 'seed-script',
    })
    .select('id')
    .single()

  if (campErr) {
    console.error('Erreur creation campagne:', campErr.message)
    process.exit(1)
  }

  console.log(`Campagne creee : ${campaign.id}`)

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

  console.log('\nCampagne seedee avec succes.')
  console.log('Prochaines etapes :')
  console.log('  1. /admin/campagnes/' + campaign.id)
  console.log('  2. Cliquer "Generer IA" pour chaque email (necessite OPENAI_API_KEY ou ANTHROPIC_API_KEY)')
  console.log('  3. Relire le contenu genere')
  console.log('  4. Passer le statut en "active"')
}

seed()
