import type { Metadata } from 'next'
import { CategoryListPage } from '../_components/CategoryListPage'
import { ANNONCES_CATEGORIES } from '@/lib/brvm/scrapers/annonces'

export const metadata: Metadata = { title: 'BRVM — Annonces émetteurs' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const SUBTYPE_NAV = [
  { key: 'all', label: 'Toutes', href: '/admin/brvm/annonces' },
  ...ANNONCES_CATEGORIES.map((c) => ({
    key: c.doc_subtype,
    label: c.label,
    href: `/admin/brvm/annonces/${c.doc_subtype}`,
  })),
]

export default async function AllAnnoncesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  return (
    <CategoryListPage
      family="announcement"
      subtypeNav={SUBTYPE_NAV}
      basePath="/admin/brvm/annonces"
      crumbLabel="Annonces émetteurs"
      searchParams={sp}
    />
  )
}
