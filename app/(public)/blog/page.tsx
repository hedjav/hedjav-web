import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles, getAllCategories } from '@/lib/articles/queries'
import { ArticleCard } from '@/components/features/ArticleCard'

export const metadata: Metadata = {
  title: 'Blog — Patrimoine, BRVM et finances Afrique',
  description:
    'Analyses, guides pratiques et veille sur la gestion de patrimoine, la BRVM et les finances personnelles en Afrique francophone.',
}

export const revalidate = 60

type PageProps = { searchParams: Promise<{ cat?: string }> }

export default async function BlogPage({ searchParams }: PageProps) {
  const { cat } = await searchParams
  const [articles, categories] = await Promise.all([
    getPublishedArticles(cat),
    getAllCategories(),
  ])

  return (
    <>
      <section className="section-sm" style={{ background: 'var(--surface)' }}>
        <div className="hedjav-container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Le blog</span>
          <h1
            className="h1"
            style={{
              marginTop: 'var(--s4)',
              fontSize: 'clamp(var(--text-4xl), 6vw, var(--text-5xl))',
            }}
          >
            Analyses & guides pratiques
          </h1>
          <p
            style={{
              marginTop: 'var(--s5)',
              color: 'var(--muted)',
              maxWidth: 640,
              marginInline: 'auto',
              fontSize: 'var(--text-lg)',
            }}
          >
            Patrimoine, BRVM, finances personnelles, IA et entrepreneuriat —
            toutes nos analyses pour l&apos;Afrique francophone.
          </p>

          {categories.length > 0 && (
            <div
              style={{
                marginTop: 'var(--s8)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 'var(--s2)',
              }}
            >
              <Link
                href="/blog"
                className={`btn btn-sm ${!cat ? 'btn-primary' : 'btn-ghost'}`}
              >
                Tous
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/blog?cat=${encodeURIComponent(c)}`}
                  className={`btn btn-sm ${cat === c ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {c}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="hedjav-container">
          {articles.length === 0 ? (
            <div className="hedjav-empty-state">
              <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>
                Aucun article {cat ? `dans « ${cat} »` : 'pour le moment'}
              </h2>
              <p style={{ color: 'var(--muted)' }}>
                Les premières analyses arrivent bientôt.
              </p>
            </div>
          ) : (
            <div className="hedjav-grid-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
