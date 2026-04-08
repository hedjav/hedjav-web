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
