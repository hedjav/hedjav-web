export type NewsletterSubscriber = {
  id: string
  email: string
  first_name: string | null
  source: string | null
  is_active: boolean
  tags: string[]
  enrolled_campaign_id: string | null
  campaign_step: number
  last_email_sent_at: string | null
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
  lead_magnet_url: string | null
  lead_magnet_description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  name: string
  type: 'welcome_sequence' | 'promo' | 'weekly' | 'custom'
  status: 'draft' | 'active' | 'paused' | 'completed'
  target_tags: string[]
  created_by: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CampaignEmail = {
  id: string
  campaign_id: string
  position: number
  subject: string
  body_prompt: string | null
  body_html: string | null
  delay_days: number
  metadata: Record<string, unknown>
  created_at: string
}

export type CampaignSend = {
  id: string
  campaign_email_id: string
  subscriber_email: string
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'failed'
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type PageView = {
  id: string
  session_id: string
  user_id: string | null
  path: string
  referrer: string | null
  user_agent: string | null
  duration_seconds: number | null
  created_at: string
}

export type UserEvent = {
  id: string
  session_id: string
  user_id: string | null
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export type SiteConfig = {
  id: string
  key: string
  value: string
  type: 'text' | 'number' | 'boolean' | 'json' | 'url' | 'email'
  category: string
  label: string | null
  description: string | null
  metadata: Record<string, unknown>
  updated_at: string
  updated_by: string | null
}

export type PopupConfig = {
  id: string
  ebook_id: string | null
  is_active: boolean
  display_delay_seconds: number
  scroll_threshold_percent: number
  headline: string
  subheadline: string | null
  cta_text: string
  disclaimer: string
  stats_shown: number
  stats_submitted: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  invoice_number: string
  purchase_id: string | null
  user_id: string | null
  user_email: string
  user_name: string | null
  ebook_title: string
  amount: number
  currency: string
  status: 'paid' | 'refunded' | 'cancelled'
  company_name: string | null
  company_address: string | null
  company_rccm: string | null
  company_ifu: string | null
  company_phone: string | null
  pdf_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AdminNotification = {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export type AiLog = {
  id: string
  action: string
  prompt: string | null
  result: string | null
  model: string
  tokens_used: number | null
  duration_ms: number | null
  status: 'success' | 'error'
  error_message: string | null
  created_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}
