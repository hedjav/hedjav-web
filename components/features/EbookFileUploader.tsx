'use client'

import { useState } from 'react'

type Props = {
  ebookId: string
  currentFilePath: string | null
  currentFileSizeBytes: number | null
  currentUploadedAt: string | null
}

/**
 * Composant d'upload du fichier livrable d'un ebook (PDF/ePub/ZIP).
 * POST /api/admin/ebooks/upload-file avec multipart/form-data.
 *
 * Le bucket est privé (migration 021). La livraison client passe par
 * /api/ebooks/download qui génère une signed URL 5 min après vérification
 * d'une purchase paid.
 */
export function EbookFileUploader({
  ebookId,
  currentFilePath,
  currentFileSizeBytes,
  currentUploadedAt,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ path: string; size: number } | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ebook_id', ebookId)

      const res = await fetch('/api/admin/ebooks/upload-file', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Upload échoué')
      } else {
        setSuccess({ path: data.file_path, size: data.file_size_bytes })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const displayedPath = success?.path ?? currentFilePath
  const displayedSize = success?.size ?? currentFileSizeBytes
  const displayedDate = success ? new Date() : currentUploadedAt ? new Date(currentUploadedAt) : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        background: 'rgba(197, 160, 40, 0.06)',
        border: '1px solid rgba(197, 160, 40, 0.25)',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: 'var(--admin-accent, #C5A028)',
            fontWeight: 700,
          }}
        >
          Fichier livrable (PDF / ePub / ZIP)
        </span>
        {displayedPath && (
          <span style={{ fontSize: 11, color: '#8BE07A' }}>● Fichier en place</span>
        )}
      </div>

      {displayedPath ? (
        <div style={{ fontSize: 13, color: 'var(--admin-text, #E7ECF5)', lineHeight: 1.6 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85 }}>{displayedPath}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            {displayedSize ? `${(displayedSize / 1024 / 1024).toFixed(2)} Mo` : '—'}
            {displayedDate && ` • Uploadé le ${displayedDate.toLocaleDateString('fr-FR')}`}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#ff9b9b', margin: 0 }}>
          ⚠ Aucun fichier uploadé — les clients qui achètent cet ebook ne peuvent rien télécharger.
        </p>
      )}

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: 'var(--admin-accent, #C5A028)',
          color: '#0F1117',
          borderRadius: 8,
          fontFamily: 'var(--fb)',
          fontSize: 13,
          fontWeight: 600,
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {uploading ? 'Upload en cours…' : displayedPath ? 'Remplacer le fichier' : 'Uploader le fichier'}
        <input
          type="file"
          accept="application/pdf,application/epub+zip,application/zip"
          onChange={handleFile}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {error && (
        <p style={{ margin: 0, fontSize: 12, color: '#ff9b9b' }}>
          Erreur : {error}
        </p>
      )}
      {success && (
        <p style={{ margin: 0, fontSize: 12, color: '#8BE07A' }}>
          ✓ Fichier uploadé avec succès. Les clients peuvent maintenant télécharger.
        </p>
      )}
    </div>
  )
}
