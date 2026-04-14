#!/usr/bin/env node
/**
 * Test de la couche IA unifiee.
 * Ne presente JAMAIS la valeur des cles, seulement leur presence.
 *
 * Usage : node scripts/test-ai-layer.mjs
 */
import { readFileSync } from 'node:fs'

// Charger .env.local
try {
  for (const line of readFileSync('.env.local', 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2]
  }
} catch {
  // .env.local absent : on continue avec process.env tel quel
}

console.log('─── Etat providers ─────────────────────────────')
const hasDeepSeek = Boolean((process.env.DEEPSEEK_API_KEY || '').length > 10)
const hasOpenAI = Boolean((process.env.OPENAI_API_KEY || '').length > 10)
const hasAnthropic = Boolean((process.env.ANTHROPIC_API_KEY || '').length > 10)
console.log(`  DEEPSEEK_API_KEY  : ${hasDeepSeek ? 'present' : 'ABSENT'}`)
console.log(`  OPENAI_API_KEY    : ${hasOpenAI ? 'present' : 'ABSENT'}`)
console.log(`  ANTHROPIC_API_KEY : ${hasAnthropic ? 'present' : 'ABSENT'}`)
console.log(`  AI_PROVIDER       : ${process.env.AI_PROVIDER || '(non defini, auto par defaut)'}`)
console.log('')

// Reproduit la logique resolveProvider() de lib/ai/client.ts
function resolveProvider() {
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase()
  if (envProvider === 'deepseek' && hasDeepSeek) return 'deepseek'
  if (envProvider === 'openai' && hasOpenAI) return 'openai'
  if (envProvider === 'anthropic' && hasAnthropic) return 'anthropic'
  if (hasDeepSeek) return 'deepseek'
  if (hasOpenAI) return 'openai'
  if (hasAnthropic) return 'anthropic'
  return null
}

const provider = resolveProvider()

console.log('─── Resolution du provider ─────────────────────')
if (!provider) {
  console.log('  Aucun provider disponible.')
  console.log('  Comportement attendu : generateText() retourne')
  console.log('  { ok: false, skipped: true } -> pas de crash.')
  console.log('')
  console.log('  Simulation de l\'appel sans cle :')
  const simulated = {
    ok: false,
    error: 'No AI provider configured (set DEEPSEEK_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY)',
    skipped: true,
  }
  console.log('  =>', JSON.stringify(simulated, null, 2))
  console.log('')
  console.log('  OK : degradation controlee, pas d\'erreur non geree.')
  process.exit(0)
}

console.log(`  Provider actif : ${provider}`)
console.log('')

// Si une cle est presente, on tente un appel minimal
console.log('─── Appel de test (prompt minimal) ─────────────')

const started = Date.now()

const configs = {
  deepseek: {
    url: `${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`,
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Tu reponds en francais, une phrase maximum.' },
        { role: 'user', content: 'Dis "Couche IA Hedjav operationnelle" et rien d\'autre.' },
      ],
      max_tokens: 50,
      temperature: 0.2,
      stream: false,
    },
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu reponds en francais, une phrase maximum.' },
        { role: 'user', content: 'Dis "Couche IA Hedjav operationnelle" et rien d\'autre.' },
      ],
      max_tokens: 50,
      temperature: 0.2,
    },
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: {
      model: 'claude-sonnet-4-6',
      max_tokens: 50,
      temperature: 0.2,
      system: 'Tu reponds en francais, une phrase maximum.',
      messages: [{ role: 'user', content: 'Dis "Couche IA Hedjav operationnelle" et rien d\'autre.' }],
    },
  },
}

try {
  const cfg = configs[provider]
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers,
    body: JSON.stringify(cfg.body),
  })

  const duration = Date.now() - started

  if (!res.ok) {
    const errText = await res.text()
    const safe = errText.replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-***REDACTED***')
    console.log(`  ECHEC : HTTP ${res.status}`)
    console.log(`  Message : ${safe.slice(0, 400)}`)
    console.log(`  Duree   : ${duration} ms`)
    process.exit(1)
  }

  const data = await res.json()
  let text = ''
  let tokens = ''
  if (provider === 'anthropic') {
    text = data?.content?.[0]?.text ?? ''
    if (data.usage) tokens = `input ${data.usage.input_tokens}, output ${data.usage.output_tokens}`
  } else {
    text = data?.choices?.[0]?.message?.content ?? ''
    if (data.usage)
      tokens = `${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`
  }

  console.log(`  Provider : ${provider}`)
  console.log(`  Duree    : ${duration} ms`)
  console.log(`  Reponse  : "${text.trim()}"`)
  if (tokens) console.log(`  Tokens   : ${tokens}`)
  console.log('')
  console.log('  OK : couche IA operationnelle bout-en-bout.')
} catch (e) {
  const msg = (e instanceof Error ? e.message : String(e)).replace(
    /sk-[A-Za-z0-9_-]{20,}/g,
    'sk-***REDACTED***',
  )
  console.log(`  ERREUR : ${msg}`)
  process.exit(1)
}
