import Link from 'next/link'
import Image from 'next/image'
import type { Ebook } from '@/lib/supabase/types'
import { EbookPriceBlock } from './EbookPriceBlock'

type Props = { ebook: Ebook }

export function EbookCard({ ebook }: Props) {
  const href = `/ebooks/${ebook.slug}`

  return (
    <Link
      href={href}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          background: 'var(--n900)',
          overflow: 'hidden',
        }}
      >
        {ebook.cover_image_url ? (
          <Image
            src={ebook.cover_image_url}
            alt={ebook.title}
            fill
            sizes="(min-width: 900px) 33vw, (min-width: 700px) 50vw, 100vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--s6)',
              fontFamily: 'var(--fd)',
              color: 'var(--g500)',
              fontSize: 'var(--text-xl)',
              textAlign: 'center',
            }}
          >
            {ebook.title}
          </div>
        )}
      </div>

      <div
        style={{
          padding: 'var(--s6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s4)',
          flex: 1,
        }}
      >
        <h3
          className="h3"
          style={{ fontSize: 'var(--text-xl)', lineHeight: 1.3 }}
        >
          {ebook.title}
        </h3>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {ebook.short_description}
        </p>
        <div style={{ marginTop: 'auto' }}>
          <EbookPriceBlock price={ebook.price} originalPrice={ebook.original_price} />
        </div>
        <span
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          Découvrir
        </span>
      </div>
    </Link>
  )
}
