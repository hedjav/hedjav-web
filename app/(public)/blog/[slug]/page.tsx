import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  getArticleBySlug,
  getRelatedArticles,
  computeReadingTime,
  formatArticleDate,
} from '@/lib/articles/queries'
import { ArticleBody } from '@/components/features/ArticleBody'
import { RelatedArticles } from '@/components/features/RelatedArticles'

export const revalidate = 60

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return { title: 'Article introuvable' }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.published_at ?? undefined,
      authors: [article.author],
      images: article.cover_image_url ? [{ url: article.cover_image_url }] : [],
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const related = await getRelatedArticles(article.slug, article.category)
  const readingTime = computeReadingTime(article.body)

  return (
    <article className="section">
      <div className="hedjav-container" style={{ maxWidth: 800 }}>
        <nav
          aria-label="Fil d’ariane"
          style={{
            marginBottom: 'var(--s6)',
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
          }}
        >
          <Link href="/blog" style={{ color: 'var(--muted)' }}>
            ← Tous les articles
          </Link>
        </nav>

        <header style={{ marginBottom: 'var(--s10)' }}>
          <Link
            href={`/blog?cat=${encodeURIComponent(article.category)}`}
            className="badge badge-gold"
            style={{ textDecoration: 'none' }}
          >
            {article.category}
          </Link>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s4)',
              marginBottom: 'var(--s5)',
              fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))',
              lineHeight: 1.15,
            }}
          >
            {article.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
            {article.excerpt}
          </p>

          <div
            style={{
              marginTop: 'var(--s6)',
              display: 'flex',
              gap: 'var(--s4)',
              alignItems: 'center',
              fontFamily: 'var(--fm)',
              fontSize: 'var(--text-xs)',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            <span>{article.author}</span>
            <span>·</span>
            <span>{formatArticleDate(article.published_at)}</span>
            <span>·</span>
            <span>{readingTime} min de lecture</span>
          </div>
        </header>

        {article.cover_image_url && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 'var(--r16)',
              overflow: 'hidden',
              marginBottom: 'var(--s10)',
              background: 'var(--n900)',
            }}
          >
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              sizes="800px"
              priority
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}

        <ArticleBody markdown={article.body} />

        <RelatedArticles articles={related} />
      </div>
    </article>
  )
}
