export type NewsletterSubscriber = {
  id: string
  email: string
  source: string | null
  is_active: boolean
  unsubscribed_at: string | null
  metadata: Record<string, unknown>
  subscribed_at: string
}

export type Purchase = {
  id: string
  user_id: string | null
  email: string
  ebook_id: string
  amount: number
  currency: string
  payment_ref: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  raw_payload: unknown
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  country: string | null
  phone: string | null
  newsletter_opt: boolean
  role: 'member' | 'admin'
  last_visit_at: string | null
  metadata: Record<string, unknown>
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
  metadata: Record<string, unknown>
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
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
