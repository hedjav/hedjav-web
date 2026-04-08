import { AdminArticleForm } from '@/components/features/AdminArticleForm'

export default function NewArticlePage() {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Nouvel article
      </h1>
      <AdminArticleForm />
    </>
  )
}
