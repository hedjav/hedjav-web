#!/usr/bin/env node
/**
 * Promeut un utilisateur en admin via service_role (bypass RLS).
 * Usage : node scripts/promote-admin.mjs <email>
 *
 * Exemple :
 *   node scripts/promote-admin.mjs hedjav@gmail.com
 *
 * Si la ligne profiles n'existe pas pour ce user, le script la crée
 * via upsert sur l'id récupéré depuis auth.users.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('❌ Usage : node scripts/promote-admin.mjs <email>')
  process.exit(1)
}

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

// 1. Trouver l'utilisateur dans auth.users via Admin API
const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listErr) {
  console.error('❌ listUsers:', listErr.message)
  process.exit(1)
}
const authUser = usersList.users.find((u) => u.email?.toLowerCase() === email)
if (!authUser) {
  console.error(`❌ Aucun compte auth trouvé pour ${email}`)
  console.error('   → Inscris-toi d\'abord via /register puis réessaie.')
  process.exit(1)
}

console.log(`✓ Auth user trouvé : ${authUser.id}`)

// 2. Upsert profile avec role='admin'
const { error: upErr } = await supabase
  .from('profiles')
  .upsert(
    {
      id: authUser.id,
      email: authUser.email,
      role: 'admin',
    },
    { onConflict: 'id' },
  )

if (upErr) {
  console.error('❌ upsert profile:', upErr.message)
  process.exit(1)
}

// 3. Vérifier
const { data: prof } = await supabase
  .from('profiles')
  .select('id, email, role, full_name')
  .eq('id', authUser.id)
  .single()

console.log(`\n✅ ${email} est désormais admin`)
console.log(`   id      : ${prof.id}`)
console.log(`   role    : ${prof.role}`)
console.log(`   nom     : ${prof.full_name ?? '—'}`)
console.log(`\nReconnecte-toi (Se déconnecter puis Se connecter) pour rafraîchir la session.`)
