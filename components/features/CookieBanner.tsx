'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Consent = { necessary: true; statistics: boolean; marketing: boolean }

function getConsent(): Consent | null {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith('hedjav_consent='))
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw.split('=')[1]))
  } catch { return null }
}

function setConsent(consent: Consent) {
  const val = encodeURIComponent(JSON.stringify(consent))
  document.cookie = `hedjav_consent=${val};path=/;max-age=${365 * 24 * 3600};SameSite=Lax`
}

type CookieTexts = {
  message: string
  acceptText: string
  rejectText: string
  policyUrl: string
}

const defaultTexts: CookieTexts = {
  message: 'Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser les contenus.',
  acceptText: 'Accepter tout',
  rejectText: 'Refuser tout',
  policyUrl: '/cookies',
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [statistics, setStatistics] = useState(true)
  const [marketing, setMarketing] = useState(true)
  const [texts, setTexts] = useState<CookieTexts>(defaultTexts)

  useEffect(() => {
    if (getConsent()) return
    // Fetch dynamic texts
    fetch('/api/config/public?keys=cookie_message,cookie_accept_text,cookie_reject_text,cookie_policy_url')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setTexts({
          message: data.cookie_message || defaultTexts.message,
          acceptText: data.cookie_accept_text || defaultTexts.acceptText,
          rejectText: data.cookie_reject_text || defaultTexts.rejectText,
          policyUrl: data.cookie_policy_url || defaultTexts.policyUrl,
        })
      })
      .catch(() => {})
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const accept = useCallback((stats: boolean, mkt: boolean) => {
    const consent: Consent = { necessary: true, statistics: stats, marketing: mkt }
    setConsent(consent)
    setVisible(false)
    window.dispatchEvent(new CustomEvent('hedjav:consent', { detail: consent }))
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1B2A4A', color: '#E0E6EF',
      borderTop: '2px solid #C5A028',
      boxShadow: '0 -4px 24px rgba(0,0,0,.3)',
      fontFamily: 'var(--fb)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px' }}>
        {!showCustomize ? (
          <>
            <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: 1.6 }}>
              {texts.message}{' '}
              <Link href={texts.policyUrl} style={{ color: '#C5A028', textDecoration: 'underline' }}>En savoir plus</Link>
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => accept(true, true)} style={{ background: '#C5A028', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                {texts.acceptText}
              </button>
              <button onClick={() => accept(false, false)} style={{ background: 'transparent', color: '#E0E6EF', border: '1.5px solid #E0E6EF', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                {texts.rejectText}
              </button>
              <button onClick={() => setShowCustomize(true)} style={{ background: 'transparent', color: 'rgba(255,255,255,.5)', border: 'none', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Gérer vos préférences</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <input type="checkbox" checked disabled style={{ accentColor: '#C5A028' }} />
                <span><strong>Nécessaires</strong> — session, authentification, thème (toujours actif)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={statistics} onChange={(e) => setStatistics(e.target.checked)} style={{ accentColor: '#C5A028' }} />
                <span><strong>Statistiques</strong> — pages visitées, clics, durée de visite</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} style={{ accentColor: '#C5A028' }} />
                <span><strong>Marketing</strong> — emails personnalisés selon votre comportement</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => accept(statistics, marketing)} style={{ background: '#C5A028', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Sauvegarder
              </button>
              <button onClick={() => setShowCustomize(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,.5)', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                Retour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Bouton discret pour ré-ouvrir le bandeau depuis le footer */
export function ManageCookiesButton() {
  return (
    <button
      onClick={() => {
        document.cookie = 'hedjav_consent=;path=/;max-age=0'
        window.location.reload()
      }}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#7A94B8',
        fontSize: '12px',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline',
        fontFamily: 'var(--fb)',
      }}
    >
      Gérer les cookies
    </button>
  )
}
