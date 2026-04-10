import type { Metadata } from 'next'
import { ArticleGeneratorClient } from './ArticleGeneratorClient'

export const metadata: Metadata = { title: 'Admin — Generateur articles IA' }

export default function AdminIAArticlesPage() {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)', marginBottom: 4 }}>
        Generateur d&apos;articles IA
      </h1>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s8)' }}>
        Generez des articles via Claude API. L&apos;article est cree en brouillon pour relecture avant publication.
      </p>
      <ArticleGeneratorClient />
    </>
  )
}
