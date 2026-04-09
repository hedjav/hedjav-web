'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function getSessionId(): string {
  let id = sessionStorage.getItem('hedjav_sid')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('hedjav_sid', id)
  }
  return id
}

function hasStatisticsConsent(): boolean {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith('hedjav_consent='))
    if (!raw) return false
    const consent = JSON.parse(decodeURIComponent(raw.split('=')[1]))
    return consent?.statistics === true
  } catch { return false }
}

function track(data: Record<string, unknown>) {
  if (!hasStatisticsConsent()) return
  const sid = getSessionId()
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hedjav-consent': 'statistics' },
    body: JSON.stringify({ ...data, session_id: sid }),
    keepalive: true,
  }).catch(() => {})
}

export function TrackingScript() {
  const pathname = usePathname()
  const startTime = useRef(Date.now())

  // Track page view on navigation
  useEffect(() => {
    startTime.current = Date.now()
    track({
      type: 'page_view',
      path: pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    })
  }, [pathname])

  // Track duration every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasStatisticsConsent()) return
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      track({
        type: 'page_view',
        path: pathname,
        duration_seconds: duration,
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  // Track buy button clicks via event delegation
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const link = target.closest('a[href*="/ebooks/"]')
      if (link && (target.closest('.btn-gold') || target.closest('[data-track="buy"]'))) {
        const href = link.getAttribute('href') ?? ''
        const slug = href.split('/ebooks/')[1]?.split('?')[0]
        if (slug) {
          track({ type: 'event', event_type: 'buy_clicked', metadata: { ebook_slug: slug } })
        }
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Listen for consent changes
  useEffect(() => {
    function onConsent() {
      if (hasStatisticsConsent()) {
        track({ type: 'page_view', path: pathname, referrer: document.referrer || null })
      }
    }
    window.addEventListener('hedjav:consent', onConsent)
    return () => window.removeEventListener('hedjav:consent', onConsent)
  }, [pathname])

  return null
}
