import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryListPage } from '../../_components/CategoryListPage'
import { ANNONCES_CATEGORIES } from '@/lib/brvm/scrapers/annonces'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type RouteParams = Promise<{ subtype: string }>

const SUBTYPE_NAV = [
  { key: 'all', label: 'Toutes', href: '/admin/brvm/annonces' },
  ...ANNONCES_CATEGORIES.map((c) => ({
    key: c.doc_subtype,
    label: c.label,
    href: `/admin/brvm/annonces/${c.doc_subtype}`,
  })),
]

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { subtype } = await params
  const cfg = ANNONCES_CATEGORIES.find((c) => c.doc_subtype === subtype)
  return { title: cfg ? `BRVM — ${cfg.label}` : 'BRVM — Annonces' }
}

export default async function AnnoncesSubtypePage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { subtype } = await params
  const sp = await searchParams
  const cfg = ANNONCES_CATEGORIES.find((c) => c.doc_subtype === subtype)
  if (!cfg) notFound()

  return (
    <CategoryListPage
      family="announcement"
      subtype={subtype}
      subtypeLabel={cfg.label}
      subtypeNav={SUBTYPE_NAV}
      basePath="/admin/brvm/annonces"
      crumbLabel="Annonces émetteurs"
      searchParams={sp}
    />
  )
}
