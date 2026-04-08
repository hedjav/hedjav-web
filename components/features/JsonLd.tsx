type Props = { data: Record<string, unknown> }

/**
 * Injecte un script JSON-LD pour les balises structurées.
 * À utiliser dans les Server Components.
 */
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hedjav.com'

export function ebookJsonLd(ebook: {
  title: string
  slug: string
  short_description: string
  cover_image_url: string | null
  price: number
  original_price: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ebook.title,
    description: ebook.short_description,
    image: ebook.cover_image_url ? `${BASE}${ebook.cover_image_url}` : undefined,
    brand: { '@type': 'Brand', name: 'Hedjav' },
    offers: {
      '@type': 'Offer',
      url: `${BASE}/ebooks/${ebook.slug}`,
      price: ebook.price,
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
    },
  }
}

export function articleJsonLd(article: {
  title: string
  slug: string
  excerpt: string
  cover_image_url: string | null
  author: string
  published_at: string | null
  updated_at: string
  category: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.cover_image_url ? `${BASE}${article.cover_image_url}` : undefined,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'Hedjav',
      logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
    },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    articleSection: article.category,
    mainEntityOfPage: `${BASE}/blog/${article.slug}`,
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hedjav',
    url: BASE,
    description: "Conseil patrimonial, ebooks et veille BRVM pour l'Afrique francophone.",
    sameAs: [
      'https://www.facebook.com/hedjav',
      'https://www.instagram.com/hedjav',
      'https://x.com/hedjav',
      'https://www.tiktok.com/@hedjav',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hedjav@gmail.com',
      contactType: 'customer support',
      areaServed: ['BJ', 'CI', 'SN', 'BF', 'ML', 'NE', 'TG', 'GW'],
      availableLanguage: ['fr'],
    },
  }
}
