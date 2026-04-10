import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/session'
import { getAllConfigs } from '@/lib/config/queries'
import { ConfigEditor } from './ConfigEditor'

export const metadata: Metadata = { title: 'Admin — Configuration' }

const categoryLabels: Record<string, string> = {
  general: 'General',
  hero: 'Hero (page d\'accueil)',
  founder: 'Fondateur',
  contact: 'Contact',
  social: 'Reseaux sociaux',
  kpi: 'Objectifs KPI',
  legal: 'Informations legales',
}

export default async function AdminConfigPage() {
  await requireAdmin()
  const configs = await getAllConfigs()

  // Transform to serializable
  const categories = Object.entries(configs).map(([category, items]) => ({
    category,
    label: categoryLabels[category] ?? category,
    items: Object.entries(items).map(([key, config]) => ({
      key,
      value: config.value,
      label: config.label,
      type: config.type,
      description: config.description,
    })),
  }))

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 8,
        }}
      >
        Configuration
      </h1>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: 14, marginBottom: 32 }}>
        Parametres globaux du site. Les modifications sont appliquees immediatement.
      </p>

      <ConfigEditor categories={categories} />
    </>
  )
}
