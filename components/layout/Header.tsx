import Link from 'next/link'
import { navLinks } from './nav-links'
import { ThemeToggle } from './ThemeToggle'
import { MobileNav } from './MobileNav'

export function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="container"
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s6)',
        }}
      >
        <Link
          href="/"
          aria-label="Hedjav — accueil"
          style={{
            fontFamily: 'var(--fd)',
            fontWeight: 600,
            fontSize: 'var(--text-3xl)',
            color: 'var(--n900)',
            lineHeight: 1,
            letterSpacing: '.01em',
          }}
        >
          Hedjav
        </Link>

        <nav className="hedjav-nav-desktop" aria-label="Navigation principale">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hedjav-nav-link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <ThemeToggle />
          <Link href="/login" className="btn btn-gold hedjav-cta-desktop">
            Espace membre
          </Link>
          <div className="hedjav-mobile-only">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
