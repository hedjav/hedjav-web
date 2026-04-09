import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/pages/queries'
import { ArticleBody } from '@/components/features/ArticleBody'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.meta_description,
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()

  return (
    <article className="section">
      <div className="hedjav-container" style={{ maxWidth: 800 }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--s12)' }}>
          <h1
            className="h1"
            style={{
              fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))',
            }}
          >
            {page.title}
          </h1>
          {page.meta_description && (
            <p
              style={{
                marginTop: 'var(--s5)',
                color: 'var(--muted)',
                fontSize: 'var(--text-lg)',
                maxWidth: 640,
                marginInline: 'auto',
              }}
            >
              {page.meta_description}
            </p>
          )}
        </header>

        <ArticleBody markdown={page.body} />
      </div>
    </article>
  )
}
