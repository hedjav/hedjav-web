/**
 * Utilitaires de validation — normalisation email, force mot de passe, téléphone UEMOA.
 */

/* ── Email normalisation ─────────────────────────────────────── */

/**
 * Normalise un email pour détecter les doublons :
 * - Gmail : supprime les points et le +tag avant @
 * - Outlook/Hotmail/Live : supprime le +tag
 * - Yahoo/Ymail : supprime le -tag (Yahoo utilise - au lieu de +)
 * - Autres : supprime le +tag
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const atIdx = trimmed.indexOf('@')
  if (atIdx === -1) return trimmed

  let local = trimmed.slice(0, atIdx)
  const domain = trimmed.slice(atIdx + 1)

  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
  const isOutlook = ['outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr'].includes(domain)
  const isYahoo = ['yahoo.com', 'yahoo.fr', 'ymail.com'].includes(domain)

  if (isGmail) {
    // Gmail ignore les points et le +tag
    local = local.replace(/\./g, '')
    const plusIdx = local.indexOf('+')
    if (plusIdx !== -1) local = local.slice(0, plusIdx)
  } else if (isOutlook) {
    // Outlook ignore le +tag
    const plusIdx = local.indexOf('+')
    if (plusIdx !== -1) local = local.slice(0, plusIdx)
  } else if (isYahoo) {
    // Yahoo utilise le -tag (pas +)
    const dashIdx = local.indexOf('-')
    if (dashIdx !== -1) local = local.slice(0, dashIdx)
  } else {
    // Générique : supprime le +tag
    const plusIdx = local.indexOf('+')
    if (plusIdx !== -1) local = local.slice(0, plusIdx)
  }

  return `${local}@${domain}`
}

/* ── Password strength ───────────────────────────────────────── */

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3
  label: 'Faible' | 'Moyen' | 'Bon' | 'Fort'
  errors: string[]
  isValid: boolean
}

/**
 * Évalue la force d'un mot de passe.
 * Critères minimum : 8 caractères, 1 majuscule, 1 chiffre.
 * Score 0-3 basé sur le nombre de critères remplis + longueur.
 */
export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Au moins 8 caractères requis')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins 1 lettre majuscule requise')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins 1 chiffre requis')
  }

  const isValid = errors.length === 0

  // Score calculation
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++
  if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) score++

  const labels: Record<number, PasswordStrength['label']> = {
    0: 'Faible',
    1: 'Moyen',
    2: 'Bon',
    3: 'Fort',
  }

  return {
    score: score as PasswordStrength['score'],
    label: labels[score],
    errors,
    isValid,
  }
}

/* ── Phone UEMOA ─────────────────────────────────────────────── */

/**
 * Codes pays et longueurs de numéro pour la zone UEMOA.
 * Le format attendu est international : +XXX XXXXXXXXX
 */
const UEMOA_PHONE_PATTERNS: Record<string, { code: string; digits: number[]; name: string }> = {
  '229': { code: '229', digits: [10], name: 'Bénin' },
  '226': { code: '226', digits: [8], name: 'Burkina Faso' },
  '225': { code: '225', digits: [10], name: "Côte d'Ivoire" },
  '223': { code: '223', digits: [8], name: 'Mali' },
  '221': { code: '221', digits: [9], name: 'Sénégal' },
  '228': { code: '228', digits: [8], name: 'Togo' },
  '227': { code: '227', digits: [8], name: 'Niger' },
  '245': { code: '245', digits: [7, 9], name: 'Guinée-Bissau' },
}

export type PhoneValidation = {
  isValid: boolean
  country: string | null
  normalized: string | null
  error: string | null
}

/**
 * Valide un numéro de téléphone UEMOA.
 * Accepte les formats : +229XXXXXXXX, 00229XXXXXXXX, 229XXXXXXXX
 */
export function validatePhone(phone: string): PhoneValidation {
  // Nettoyer : garder uniquement les chiffres et le +
  const cleaned = phone.replace(/[\s\-().]/g, '')
  let digits = cleaned.replace(/^\+/, '').replace(/^00/, '')

  // Trouver le code pays (3 chiffres pour UEMOA)
  const code3 = digits.slice(0, 3)
  const pattern = UEMOA_PHONE_PATTERNS[code3]

  if (!pattern) {
    return {
      isValid: false,
      country: null,
      normalized: null,
      error: 'Code pays non reconnu. Pays UEMOA supportés : Bénin (229), Burkina (226), CI (225), Mali (223), Sénégal (221), Togo (228), Niger (227), Guinée-Bissau (245).',
    }
  }

  const nationalNumber = digits.slice(3)
  const validLength = pattern.digits.includes(nationalNumber.length)

  if (!validLength) {
    return {
      isValid: false,
      country: pattern.name,
      normalized: null,
      error: `Numéro ${pattern.name} invalide. ${pattern.digits.length === 1 ? `${pattern.digits[0]} chiffres` : `${pattern.digits.join(' ou ')} chiffres`} attendus après le code pays.`,
    }
  }

  if (!/^\d+$/.test(nationalNumber)) {
    return {
      isValid: false,
      country: pattern.name,
      normalized: null,
      error: 'Le numéro ne doit contenir que des chiffres.',
    }
  }

  return {
    isValid: true,
    country: pattern.name,
    normalized: `+${pattern.code}${nationalNumber}`,
    error: null,
  }
}
