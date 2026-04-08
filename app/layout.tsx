import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd, organizationJsonLd } from '@/components/features/JsonLd'

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
  metadataBase: new URL('https://hedjav.com'),
  title: {
    default: 'Hedjav — Gestion de patrimoine en Afrique',
    template: '%s · Hedjav',
  },
  description:
    "Hedjav accompagne particuliers et entrepreneurs d'Afrique francophone dans la construction et la transmission de leur patrimoine.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://hedjav.com',
    siteName: 'Hedjav',
    title: 'Hedjav — Gestion de patrimoine en Afrique',
    description:
      "Conseil patrimonial, ebooks, formations et veille BRVM pour l'Afrique francophone.",
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
        </ThemeProvider>
      </body>
    </html>
  )
}
