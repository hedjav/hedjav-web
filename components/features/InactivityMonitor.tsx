'use client'

import { useEffect, useRef } from 'react'

/**
 * Composant monté dans les layouts authentifiés (admin + dashboard).
 *
 * Politique :
 *  - ping `/api/auth/activity-touch` au mount (rafraîchit `last_visit_at`)
 *  - re-ping à chaque activité utilisateur, limité à 1 fois toutes les 2 min
 *    pour ne pas spammer la base
 *  - re-ping à chaque focus de fenêtre (onglet revenu au premier plan)
 *
 * L'expiration elle-même est faite côté serveur dans `proxy.ts`. Ce composant
 * se contente de prolonger la session tant que l'utilisateur interagit.
 */
const THROTTLE_MS = 2 * 60 * 1000 // 2 minutes entre deux pings max

export function InactivityMonitor() {
  const lastPingRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false

    async function ping(force = false) {
      const now = Date.now()
      if (!force && now - lastPingRef.current < THROTTLE_MS) return
      lastPingRef.current = now
      try {
        await fetch('/api/auth/activity-touch', {
          method: 'POST',
          cache: 'no-store',
        })
      } catch {
        // silent : le monitor ne doit jamais casser l'UI
      }
      if (cancelled) return
    }

    // 1. Ping initial au mount (marque le visiteur comme actif)
    ping(true)

    // 2. Ping sur activité utilisateur (click / scroll / keydown)
    const onActivity = () => { ping(false) }
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('click', onActivity, opts)
    window.addEventListener('scroll', onActivity, opts)
    window.addEventListener('keydown', onActivity, opts)

    // 3. Ping sur focus de fenêtre (retour sur l'onglet)
    const onFocus = () => { ping(true) }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.removeEventListener('click', onActivity)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
