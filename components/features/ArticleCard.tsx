import Link from 'next/link'
import Image from 'next/image'
import type { Article } from '@/lib/supabase/types'
import { computeReadingTime, formatArticleDate } from '@/lib/articles/queries'

type Props = { article: Article }

export function ArticleCard({ article }: Props) {
  const readingTime = computeReadingTime(article.body)

  return (
    <Link
      href={`/blog/${article.slug}`}
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
          aspectRatio: '16 / 9',
          background: 'var(--n900)',
          overflow: 'hidden',
        }}
      >
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={article.title}
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
              fontSize: 'var(--text-2xl)',
              textAlign: 'center',
            }}
          >
            {article.title}
          </div>
        )}
      </div>
      <div
        style={{
          padding: 'var(--s6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s3)',
          flex: 1,
        }}
      >
        <span
          className="badge badge-gold"
          style={{ alignSelf: 'flex-start' }}
        >
          {article.category}
        </span>
        <h3
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            lineHeight: 1.2,
            color: 'var(--text)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.title}
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
          {article.excerpt}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--s3)',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--fm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--muted)',
          }}
        >
          <span>{formatArticleDate(article.published_at)}</span>
          <span>{readingTime} min</span>
        </div>
      </div>
    </Link>
  )
}
