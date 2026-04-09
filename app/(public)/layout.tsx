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
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
      <TrackingScript />
      <LeadMagnetPopup />
    </>
  )
}
