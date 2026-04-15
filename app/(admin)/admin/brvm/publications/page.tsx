import type { Metadata } from 'next'
import { CategoryListPage } from '../_components/CategoryListPage'
import { PUBLICATIONS_CATEGORIES } from '@/lib/brvm/scrapers/publications'

export const metadata: Metadata = { title: 'BRVM — Publications' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const SUBTYPE_NAV = [
  { key: 'all', label: 'Toutes', href: '/admin/brvm/publications' },
  ...PUBLICATIONS_CATEGORIES.map((c) => ({
    key: c.doc_subtype,
    label: c.label.replace(/\s—.*/, ''),
    href: `/admin/brvm/publications/${c.doc_subtype}`,
  })),
]

export default async function AllPublicationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  return (
    <CategoryListPage
      family="publication"
      subtypeNav={SUBTYPE_NAV}
      basePath="/admin/brvm/publications"
      crumbLabel="Publications"
      searchParams={sp}
    />
  )
}
