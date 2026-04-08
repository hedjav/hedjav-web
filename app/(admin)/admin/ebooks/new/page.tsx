import { AdminEbookForm } from '@/components/features/AdminEbookForm'

export default function NewEbookPage() {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-3xl)', color: '#fff', marginBottom: 'var(--s8)' }}>
        Nouvel ebook
      </h1>
      <AdminEbookForm />
    </>
  )
}
