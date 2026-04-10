'use client'

import { useState } from 'react'

type ConfigItem = {
  key: string
  value: string
  label: string
  type: string
  description: string
}

type Category = {
  category: string
  label: string
  items: ConfigItem[]
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--admin-accent)' : 'var(--admin-border)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: checked ? '#0F1117' : 'var(--admin-text-muted)',
          transition: 'left .2s',
        }}
      />
    </button>
  )
}

export function ConfigEditor({ categories }: { categories: Category[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const cat of categories) {
      for (const item of cat.items) {
        init[item.key] = item.value
      }
    }
    return init
  })

  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  function updateValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  async function saveCategory(category: string, items: ConfigItem[]) {
    setSaving((prev) => ({ ...prev, [category]: true }))
    setSaved((prev) => ({ ...prev, [category]: false }))

    const formData = new FormData()
    for (const item of items) {
      formData.set(`config__${item.key}`, values[item.key] ?? '')
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [category]: true }))
        setTimeout(() => setSaved((prev) => ({ ...prev, [category]: false })), 3000)
      }
    } catch { /* ignore */ }
    setSaving((prev) => ({ ...prev, [category]: false }))
  }

  const isLongText = (item: ConfigItem) => {
    return item.key.includes('bio') || item.key.includes('description') || item.key.includes('body') || item.value.length > 100
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {categories.map(({ category, label, items }) => (
        <div
          key={category}
          style={{
            background: 'var(--admin-surface)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid var(--admin-border)',
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
            {label}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {items.map((item) => (
              <div key={item.key}>
                <label
                  htmlFor={`config__${item.key}`}
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--admin-text)',
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </label>
                {item.description && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--admin-text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {item.description}
                  </div>
                )}

                {item.type === 'boolean' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ToggleSwitch
                      checked={values[item.key] === 'true'}
                      onChange={(v) => updateValue(item.key, v ? 'true' : 'false')}
                    />
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {values[item.key] === 'true' ? 'Active' : 'Desactive'}
                    </span>
                  </div>
                ) : isLongText(item) ? (
                  <textarea
                    id={`config__${item.key}`}
                    value={values[item.key] ?? ''}
                    onChange={(e) => updateValue(item.key, e.target.value)}
                    rows={4}
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
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <input
                    id={`config__${item.key}`}
                    type={
                      item.type === 'number'
                        ? 'number'
                        : item.type === 'email'
                          ? 'email'
                          : item.type === 'url'
                            ? 'url'
                            : 'text'
                    }
                    value={values[item.key] ?? ''}
                    onChange={(e) => updateValue(item.key, e.target.value)}
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
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <button
              onClick={() => saveCategory(category, items)}
              disabled={saving[category]}
              style={{
                background: saving[category] ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
                color: '#0F1117',
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                fontFamily: 'var(--fb)',
                fontWeight: 600,
                fontSize: 13,
                cursor: saving[category] ? 'wait' : 'pointer',
              }}
            >
              {saving[category] ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {saved[category] && (
              <span style={{ fontSize: 12, color: 'var(--admin-success)' }}>
                Modifications enregistrees
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
