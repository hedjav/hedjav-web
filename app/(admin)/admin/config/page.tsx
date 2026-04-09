import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import { getAllConfigs, updateConfig } from '@/lib/config/queries'

export const metadata: Metadata = { title: 'Admin — Configuration' }

const categoryLabels: Record<string, string> = {
  general: 'Général',
  hero: 'Hero (page d\'accueil)',
  founder: 'Fondateur',
  contact: 'Contact',
  social: 'Réseaux sociaux',
  kpi: 'Objectifs KPI',
  legal: 'Informations légales',
}

export default async function AdminConfigPage() {
  const profile = await requireAdmin()
  const configs = await getAllConfigs()

  async function saveConfig(formData: FormData) {
    'use server'
    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
      if (key.startsWith('config__')) {
        const configKey = key.replace('config__', '')
        await updateConfig(configKey, String(value), profile.email)
      }
    }
    revalidatePath('/admin/config')
  }

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
        Paramètres globaux du site. Les modifications sont appliquées immédiatement.
      </p>

      <form action={saveConfig}>
        {Object.entries(configs).map(([category, items]) => (
          <div
            key={category}
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid var(--admin-border)',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.15em',
                color: 'var(--admin-accent)',
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              {categoryLabels[category] ?? category}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(items).map(([key, config]) => (
                <div key={key}>
                  <label
                    htmlFor={`config__${key}`}
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--admin-text)',
                      marginBottom: 4,
                    }}
                  >
                    {config.label}
                  </label>
                  {config.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--admin-text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      {config.description}
                    </div>
                  )}
                  <input
                    id={`config__${key}`}
                    name={`config__${key}`}
                    type={
                      config.type === 'number'
                        ? 'number'
                        : config.type === 'email'
                          ? 'email'
                          : config.type === 'url'
                            ? 'url'
                            : 'text'
                    }
                    defaultValue={config.value}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--admin-bg)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 8,
                      color: 'var(--admin-text)',
                      fontFamily: 'var(--fb)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          style={{
            background: 'var(--admin-accent)',
            color: '#0F1117',
            padding: '12px 32px',
            borderRadius: 8,
            border: 'none',
            fontFamily: 'var(--fb)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Enregistrer les modifications
        </button>
      </form>
    </>
  )
}
