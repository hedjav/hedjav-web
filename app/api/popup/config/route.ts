import { NextResponse } from 'next/server'
import { getActivePopupConfig } from '@/lib/popup/queries'

export async function GET() {
  const config = await getActivePopupConfig()
  if (!config) return NextResponse.json({ active: false })

  return NextResponse.json({
    active: true,
    id: config.id,
    headline: config.headline,
    subheadline: config.subheadline ?? config.ebook?.lead_magnet_description ?? '',
    cta_text: config.cta_text,
    disclaimer: config.disclaimer,
    display_delay_seconds: config.display_delay_seconds,
    scroll_threshold_percent: config.scroll_threshold_percent,
    ebook: config.ebook ? {
      id: config.ebook.id,
      title: config.ebook.title,
      slug: config.ebook.slug,
      cover_image_url: config.ebook.cover_image_url,
    } : null,
  })
}
