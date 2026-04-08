import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPageBySlug } from '@/lib/pages/queries'
import { ArticleBody } from '@/components/features/ArticleBody'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('a-propos')
  return {
    title: page?.title ?? 'À propos',
    description: page?.meta_description ?? 'À propos de Hedjav',
  }
}

export default async function AProposPage() {
  const page = await getPageBySlug('a-propos')
  if (!page) notFound()

  return (
    <article className="section">
      <div className="hedjav-container" style={{ maxWidth: 800 }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--s12)' }}>
          {page.cover_image_url && (
            <div
              style={{
                position: 'relative',
                width: 220,
                height: 220,
                borderRadius: 'var(--rfull)',
                overflow: 'hidden',
                margin: '0 auto var(--s8)',
                boxShadow: 'var(--shc)',
                border: '4px solid var(--g500)',
              }}
            >
              <Image
                src={page.cover_image_url}
                alt={page.title}
                fill
                sizes="220px"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                priority
              />
            </div>
          )}
          <span className="eyebrow">Hedjav</span>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s4)',
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
