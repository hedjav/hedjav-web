'use client'

import { useState, useRef } from 'react'

type MediaItem = {
  name: string
  url: string
  created_at: string
  size: number
}

function isImage(name: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(name)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function MediathequeClient({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/media/upload', { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json()
        setItems((prev) => [
          { name: data.name, url: data.url, created_at: new Date().toISOString(), size: file.size },
          ...prev,
        ])
      }
    } catch (err) {
      console.error('Upload failed', err)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(name: string) {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      const res = await fetch('/api/media/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.name !== name))
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  function copyUrl(url: string, name: string) {
    navigator.clipboard.writeText(url)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      {/* Upload */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <label
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'var(--admin-accent)',
            color: '#0F1117',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: 'var(--fb)',
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          {uploading ? 'Upload en cours...' : 'Ajouter un fichier'}
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{ padding: 'var(--s10)', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>
          Aucun fichier dans la mediatheque
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 'var(--s4)',
          }}
        >
          {items.map((item) => (
            <div
              key={item.name}
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '100%',
                  height: 120,
                  background: 'var(--admin-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {isImage(item.name) ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: 28 }}>
                    {item.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--admin-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 4,
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
                {item.size > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', marginBottom: 8 }}>
                    {formatSize(item.size)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => copyUrl(item.url, item.name)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      background: 'rgba(197,160,40,.15)',
                      color: 'var(--admin-accent)',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copied === item.name ? 'Copie !' : 'Copier URL'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.name)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255,80,80,.15)',
                      color: '#ff9b9b',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
