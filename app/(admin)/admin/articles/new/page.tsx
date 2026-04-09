import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminArticleForm } from '@/components/features/AdminArticleForm'

export const metadata: Metadata = { title: 'Admin — Nouvel article' }

export default function NewArticlePage() {
  return (
    <>
      <Link
        href="/admin/articles"
        style={{ color: '#6B82B0', fontSize: 13, marginBottom: 16, display: 'inline-block' }}
      >
        ← Retour aux articles
      </Link>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 32,
        }}
      >
        Nouvel article
      </h1>
      <AdminArticleForm />
    </>
  )
}
