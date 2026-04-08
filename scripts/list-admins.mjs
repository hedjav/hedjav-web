#!/usr/bin/env node
/**
 * Liste tous les admins existants en base.
 * Usage : node scripts/list-admins.mjs
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
  console.error('❌ Missing env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: all, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, role, created_at')
  .order('created_at', { ascending: false })

if (error) {
  console.error('❌', error.message)
  process.exit(1)
}

const admins = (all ?? []).filter((r) => r.role === 'admin')
const members = (all ?? []).filter((r) => r.role !== 'admin')

console.log(`\n📊 Profiles : ${all?.length ?? 0} total — ${admins.length} admin(s), ${members.length} membre(s)\n`)

if (admins.length > 0) {
  console.log('━━ ADMINS ━━')
  for (const a of admins) {
    console.log(`  • ${a.email}  (${a.full_name ?? '—'})  id=${a.id}`)
  }
} else {
  console.log('Aucun admin en base.')
}

console.log()
console.log('━━ MEMBRES ━━')
for (const m of members.slice(0, 10)) {
  console.log(`  • ${m.email}  (${m.full_name ?? '—'})`)
}
if (members.length > 10) console.log(`  … et ${members.length - 10} autres`)
console.log()
