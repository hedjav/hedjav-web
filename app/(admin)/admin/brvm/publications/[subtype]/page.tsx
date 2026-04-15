import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryListPage } from '../../_components/CategoryListPage'
import { PUBLICATIONS_CATEGORIES } from '@/lib/brvm/scrapers/publications'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type RouteParams = Promise<{ subtype: string }>

const SUBTYPE_NAV = [
  { key: 'all', label: 'Toutes', href: '/admin/brvm/publications' },
  ...PUBLICATIONS_CATEGORIES.map((c) => ({
    key: c.doc_subtype,
    label: c.label.replace(/\s—.*/, ''),
    href: `/admin/brvm/publications/${c.doc_subtype}`,
  })),
]

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { subtype } = await params
  const cfg = PUBLICATIONS_CATEGORIES.find((c) => c.doc_subtype === subtype)
  return { title: cfg ? `BRVM — ${cfg.label}` : 'BRVM — Publications' }
}

export default async function PublicationsSubtypePage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { subtype } = await params
  const sp = await searchParams
  const cfg = PUBLICATIONS_CATEGORIES.find((c) => c.doc_subtype === subtype)
  if (!cfg) notFound()

  return (
    <CategoryListPage
      family="publication"
      subtype={subtype}
      subtypeLabel={cfg.label.replace(/\s—.*/, '')}
      subtypeNav={SUBTYPE_NAV}
      basePath="/admin/brvm/publications"
      crumbLabel="Publications"
      searchParams={sp}
    />
  )
}
