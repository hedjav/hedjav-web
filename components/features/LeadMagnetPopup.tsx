'use client'

import { useState, useEffect, useCallback } from 'react'

type PopupData = {
  active: boolean
  id: string
  headline: string
  subheadline: string
  cta_text: string
  disclaimer: string
  display_delay_seconds: number
  scroll_threshold_percent: number
  ebook: { id: string; title: string; slug: string; cover_image_url: string | null } | null
}

function getSessionId(): string {
  let id = sessionStorage.getItem('hedjav_sid')
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('hedjav_sid', id) }
  return id
}

function hasStatisticsConsent(): boolean {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith('hedjav_consent='))
    if (!raw) return false
    return JSON.parse(decodeURIComponent(raw.split('=')[1]))?.statistics === true
  } catch { return false }
}

function hasCookie(name: string): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${name}=`))
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`
}

export function LeadMagnetPopup() {
  const [config, setConfig] = useState<PopupData | null>(null)
  const [visible, setVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load config
  useEffect(() => {
    if (hasCookie('hedjav_popup_subscribed') || hasCookie('hedjav_popup_dismissed')) return
    fetch('/api/popup/config').then((r) => r.json()).then((d) => {
      if (d.active) setConfig(d)
    }).catch(() => {})
  }, [])

  // Show after delay or scroll
  useEffect(() => {
    if (!config || visible || hasCookie('hedjav_popup_subscribed') || hasCookie('hedjav_popup_dismissed')) return
    const cfg = config

    const timer = setTimeout(() => setVisible(true), cfg.display_delay_seconds * 1000)

    function onScroll() {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      if (scrollPercent >= cfg.scroll_threshold_percent) {
        setVisible(true)
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [config, visible])

  // Track popup shown
  useEffect(() => {
    if (visible && config && hasStatisticsConsent()) {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-hedjav-consent': 'statistics' },
        body: JSON.stringify({ type: 'event', event_type: 'popup_shown', session_id: getSessionId(), metadata: { popup_id: config.id } }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [visible, config])

  const close = useCallback(() => {
    setVisible(false)
    // Cookie dismissed 30 jours
    setCookie('hedjav_popup_dismissed', '1', 2592000)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, close])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const firstName = String(fd.get('first_name') ?? '').trim()
    const phone = String(fd.get('phone') ?? '').trim()

    if (!email) { setError('Email requis'); setLoading(false); return }

    try {
      // Subscribe to newsletter
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          source: 'popup',
          type: 'lead_magnet' as const,
          ...(phone ? { phone } : {}),
          ...(config?.ebook ? { ebook_id: config.ebook.id } : {}),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (data.alreadySubscribed) {
        setAlreadySubscribed(true)
      }

      // Send lead magnet if ebook has one
      if (config?.ebook) {
        await fetch('/api/popup/send-lead-magnet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, first_name: firstName, ebook_id: config.ebook.id, popup_config_id: config.id }),
        })
      }

      // Track event
      if (hasStatisticsConsent()) {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-hedjav-consent': 'statistics' },
          body: JSON.stringify({ type: 'event', event_type: 'popup_submitted', session_id: getSessionId(), metadata: { popup_id: config?.id } }),
          keepalive: true,
        }).catch(() => {})
      }

      setSubmitted(true)
      // Cookie subscribed 365 jours
      setCookie('hedjav_popup_subscribed', '1', 31536000)
    } catch {
      setError('Erreur, veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (!visible || !config) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(13,22,40,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: '#F8F5EE', borderRadius: '16px', maxWidth: 520, width: '100%',
        boxShadow: '0 20px 60px rgba(13,22,40,.3), 0 0 0 1px rgba(197,160,40,.3)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Close button */}
        <button onClick={close} aria-label="Fermer" style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1,
          background: 'rgba(27,42,74,.08)', border: 'none', borderRadius: '50%',
          width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1B2A4A', fontSize: '18px', fontWeight: 700,
        }}>×</button>

        {/* Ebook cover */}
        {config.ebook?.cover_image_url && (
          <div style={{ background: '#1B2A4A', padding: '24px', textAlign: 'center' }}>
            <img
              src={config.ebook.cover_image_url}
              alt={config.ebook.title}
              style={{ maxHeight: 180, borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}
            />
          </div>
        )}

        <div style={{ padding: '28px 32px', fontFamily: 'var(--fb)' }}>
          {!submitted ? (
            <>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '26px', fontWeight: 600, color: '#1B2A4A', margin: '0 0 8px', lineHeight: 1.2 }}>
                {config.headline}
              </h2>
              <p style={{ color: '#5C6F8F', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
                {config.subheadline}
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  name="first_name"
                  placeholder="Votre prénom"
                  style={{
                    padding: '12px 16px', border: '1.5px solid #E0E6EF', borderRadius: '8px',
                    fontSize: '14px', fontFamily: 'var(--fb)', color: '#1B2A4A', background: '#fff',
                  }}
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Votre email"
                  style={{
                    padding: '12px 16px', border: '1.5px solid #E0E6EF', borderRadius: '8px',
                    fontSize: '14px', fontFamily: 'var(--fb)', color: '#1B2A4A', background: '#fff',
                  }}
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="WhatsApp (optionnel)"
                  style={{
                    padding: '12px 16px', border: '1.5px solid #E0E6EF', borderRadius: '8px',
                    fontSize: '14px', fontFamily: 'var(--fb)', color: '#1B2A4A', background: '#fff',
                  }}
                />
                {error && <p style={{ color: '#B91C1C', fontSize: '13px', margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#C5A028', color: '#fff', border: 'none', padding: '14px',
                    borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Envoi...' : config.cta_text}
                </button>
              </form>
              <p style={{ fontSize: '11px', color: '#8B8B8B', marginTop: '12px', textAlign: 'center' }}>
                {config.disclaimer}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '24px', color: '#1B2A4A', margin: '0 0 8px' }}>
                {alreadySubscribed ? 'Vous êtes déjà inscrit !' : 'Vérifiez votre email !'}
              </h2>
              <p style={{ color: '#5C6F8F', fontSize: '14px' }}>
                {alreadySubscribed
                  ? 'Votre guide vous a quand même été renvoyé. Pensez à vérifier vos spams.'
                  : 'Votre guide vous a été envoyé. Pensez à vérifier vos spams.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
