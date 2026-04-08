import Link from 'next/link'

const socials = [
  {
    href: 'https://www.facebook.com/hedjav',
    label: 'Facebook',
    path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z',
  },
  {
    href: 'https://www.instagram.com/hedjav',
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.58 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.2 8.8 2.2 12 2.2zm0 5.6a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 6.93a2.73 2.73 0 1 1 0-5.46 2.73 2.73 0 0 1 0 5.46zm5.35-7.1a.98.98 0 1 1-1.96 0 .98.98 0 0 1 1.96 0z',
  },
  {
    href: 'https://x.com/hedjav',
    label: 'X',
    path: 'M18.244 2H21l-6.52 7.45L22 22h-6.79l-4.74-6.2L4.8 22H2l7.04-8.04L2 2h6.91l4.29 5.67L18.24 2zm-1.19 18h1.65L7.04 4H5.27l11.78 16z',
  },
  {
    href: 'https://www.tiktok.com/@hedjav',
    label: 'TikTok',
    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.51a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84z',
  },
  {
    href: 'https://wa.me/22901978903630',
    label: 'WhatsApp',
    path: 'M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2s-.8.9-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.2-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.9z',
  },
]

const navCols = [
  {
    title: 'Navigation',
    links: [
      { href: '/ebooks', label: 'Ebooks' },
      { href: '/blog', label: 'Blog' },
      { href: '/#newsletter', label: 'Newsletter' },
      { href: '/a-propos', label: 'À propos' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/cgv', label: 'CGV' },
      { href: '/mentions-legales', label: 'Mentions légales' },
      { href: '/confidentialite', label: 'Confidentialité' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
]

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--n950)',
        color: '#E0E6EF',
        marginTop: 'var(--s20)',
      }}
    >
      <div className="hedjav-container" style={{ paddingBlock: 'var(--s16)' }}>
        <div className="hedjav-footer-grid">
          {/* Col 1 — brand */}
          <div>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--fd)',
                fontWeight: 600,
                fontSize: 'var(--text-4xl)',
                color: '#FFFFFF',
                display: 'inline-block',
                marginBottom: 'var(--s4)',
              }}
            >
              Hedjav
            </Link>
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: '#C2CEDE', marginBottom: 'var(--s4)' }}>
              École en ligne de la gestion de patrimoine pour la zone UEMOA. Ebooks, formations BRVM et analyses patrimoniales.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: '#7A94B8' }}>
              Édité par KTALYZ SARL · Cotonou, Bénin
            </p>
          </div>

          {/* Col 2 & 3 — nav + legal */}
          {navCols.map((col) => (
            <div key={col.title}>
              <h3
                style={{
                  fontFamily: 'var(--fb)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.2em',
                  color: '#C5A028',
                  marginBottom: 'var(--s4)',
                }}
              >
                {col.title}
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      style={{ fontSize: 'var(--text-sm)', color: '#C2CEDE', transition: 'color var(--tf)' }}
                      className="hedjav-footer-link"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Col 4 — contact */}
          <div>
            <h3
              style={{
                fontFamily: 'var(--fb)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.2em',
                color: '#C5A028',
                marginBottom: 'var(--s4)',
              }}
            >
              Contact
            </h3>
            <a
              href="mailto:hedjav@gmail.com"
              style={{ fontSize: 'var(--text-sm)', color: '#C2CEDE', display: 'block', marginBottom: 'var(--s2)' }}
            >
              hedjav@gmail.com
            </a>
            <p style={{ fontSize: 'var(--text-sm)', color: '#C2CEDE', marginBottom: 'var(--s4)' }}>Bénin</p>
            <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: 36,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--rfull)',
                    border: '1px solid rgba(255,255,255,.15)',
                    color: '#E0E6EF',
                    transition: 'all var(--tf)',
                  }}
                  className="hedjav-social"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 'var(--s12)',
            paddingTop: 'var(--s6)',
            borderTop: '1px solid rgba(255,255,255,.08)',
            fontSize: 'var(--text-xs)',
            color: '#7A94B8',
            textAlign: 'center',
          }}
        >
          © 2026 Hedjav. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
