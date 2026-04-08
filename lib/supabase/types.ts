export type Profile = {
  id: string
  email: string
  full_name: string | null
  country: string | null
  phone: string | null
  newsletter_opt: boolean
  role: 'member' | 'admin'
  created_at: string
  updated_at: string
}

export type Article = {
  id: string
  title: string
  slug: string
  excerpt: string
  body: string
  category: string
  cover_image_url: string | null
  author: string
  published_at: string | null
  featured: boolean
  is_published: boolean
  created_by: string | null
  source: 'manual' | 'ai'
  quality_score: number | null
  created_at: string
  updated_at: string
}

export type Ebook = {
  id: string
  title: string
  slug: string
  short_description: string
  description: string
  price: number
  original_price: number
  cover_image_url: string | null
  fedapay_link: string
  features: string[]
  target_audience: string[]
  is_published: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}
