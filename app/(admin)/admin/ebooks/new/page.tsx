import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminEbookForm } from '@/components/features/AdminEbookForm'

export const metadata: Metadata = { title: 'Admin — Nouvel ebook' }

export default function NewEbookPage() {
  return (
    <>
      <Link
        href="/admin/ebooks"
        style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 16, display: 'inline-block' }}
      >
        ← Retour aux ebooks
      </Link>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 32,
        }}
      >
        Nouvel ebook
      </h1>
      <AdminEbookForm />
    </>
  )
}
