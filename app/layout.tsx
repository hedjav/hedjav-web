import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd, organizationJsonLd } from '@/components/features/JsonLd'
import { CookieBanner } from '@/components/features/CookieBanner'
import { TrackingScript } from '@/components/features/TrackingScript'
import { LeadMagnetPopup } from '@/components/features/LeadMagnetPopup'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--fd',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--fb',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fm',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'),
  title: {
    default: 'Hedjav — École en ligne de la Gestion de Patrimoine · Zone UEMOA',
    template: '%s · Hedjav',
  },
  description:
    "Hedjav est l'école en ligne de la gestion de patrimoine pour la zone UEMOA. Ebooks, formations BRVM, analyses exclusives et outils patrimoniaux pour l'Afrique francophone.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com',
    siteName: 'Hedjav',
    title: 'Hedjav — École en ligne de la Gestion de Patrimoine · Zone UEMOA',
    description:
      'Ebooks, formations BRVM, analyses patrimoniales et outils pour bâtir un patrimoine durable en zone UEMOA.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <JsonLd data={organizationJsonLd()} />
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
          <TrackingScript />
          <LeadMagnetPopup />
        </ThemeProvider>
      </body>
    </html>
  )
}
