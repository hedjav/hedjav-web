'use client'

import { useState, useEffect, useRef } from 'react'

type MediaItem = { name: string; url: string; size: number }

type Props = {
  value: string
  onChange: (url: string) => void
}

export function MediaPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchMedia() {
    setLoading(true)
    try {
      const res = await fetch('/api/media/list')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    if (open) fetchMedia()
  }, [open])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onChange(data.url)
        await fetchMedia()
      }
    } catch { /* ignore */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL de l'image"
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--admin-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            color: 'var(--admin-text)',
            fontFamily: 'var(--fb)',
            fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 16px',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 8,
            color: 'var(--admin-text-muted)',
            fontFamily: 'var(--fb)',
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Mediatheque
        </button>
      </div>

      {value && (
        <div style={{ marginTop: 8 }}>
          <img
            src={value}
            alt="Preview"
            style={{ height: 80, borderRadius: 6, objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 16,
              padding: 24,
              width: '90vw',
              maxWidth: 720,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 22, color: 'var(--admin-text)', fontWeight: 600 }}>
                Mediatheque
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--admin-text-muted)',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            {/* Upload */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'var(--admin-accent)',
                  color: '#0F1117',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--fb)',
                  cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                {uploading ? 'Upload...' : 'Uploader une image'}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Grid */}
            {loading ? (
              <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Chargement...</p>
            ) : items.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Aucune image dans la mediatheque.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {items.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => { onChange(item.url); setOpen(false) }}
                    style={{
                      background: 'var(--admin-bg)',
                      border: value === item.url ? '2px solid var(--admin-accent)' : '1px solid var(--admin-border)',
                      borderRadius: 8,
                      padding: 4,
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                    <div style={{
                      fontSize: 10,
                      color: 'var(--admin-text-muted)',
                      padding: '4px 2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
