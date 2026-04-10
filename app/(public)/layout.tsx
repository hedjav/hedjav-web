import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd, organizationJsonLd } from '@/components/features/JsonLd'
import { CookieBanner } from '@/components/features/CookieBanner'
import { TrackingScript } from '@/components/features/TrackingScript'
import { LeadMagnetPopup } from '@/components/features/LeadMagnetPopup'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <a
        href="#main-content"
        className="skip-nav"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          zIndex: 9999,
        }}
      >
        Aller au contenu principal
      </a>
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
      <TrackingScript />
      <LeadMagnetPopup />
    </>
  )
}
