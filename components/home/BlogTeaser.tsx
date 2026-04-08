import { getFeaturedArticles } from '@/lib/articles/queries'
import { ArticleCard } from '@/components/features/ArticleCard'

export async function BlogTeaser() {
  const articles = await getFeaturedArticles(3)

  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="hedjav-container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--s10)' }}>
          <span className="eyebrow">Le blog</span>
          <h2 className="h2" style={{ marginTop: 'var(--s4)' }}>
            Analyses & guides récents
          </h2>
        </div>

        {articles.length === 0 ? (
          <div className="hedjav-empty-state">
            <h3 className="h3" style={{ marginBottom: 'var(--s3)' }}>
              Premiers articles bientôt
            </h3>
            <p style={{ color: 'var(--muted)', maxWidth: 520, marginInline: 'auto' }}>
              Patrimoine, BRVM et finances personnelles — nos premières analyses
              arrivent dans les prochains jours.
            </p>
          </div>
        ) : (
          <>
            <div className="hedjav-grid-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--s10)' }}>
              <a href="/blog" className="btn btn-primary">
                Voir tout le blog
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
