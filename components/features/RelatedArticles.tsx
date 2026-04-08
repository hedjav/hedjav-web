import type { Article } from '@/lib/supabase/types'
import { ArticleCard } from './ArticleCard'

type Props = { articles: Article[] }

export function RelatedArticles({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section style={{ marginTop: 'var(--s16)' }}>
      <h2 className="h2" style={{ marginBottom: 'var(--s8)', textAlign: 'center' }}>
        Articles liés
      </h2>
      <div className="hedjav-grid-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  )
}
