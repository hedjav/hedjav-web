'use client'

import { useState } from 'react'
import { upsertArticleAction, deleteArticleAction } from '@/lib/admin/actions'
import { MediaPicker } from '@/components/admin/MediaPicker'
import type { Article } from '@/lib/supabase/types'

const CATEGORIES = [
  'BRVM',
  'Patrimoine',
  'IA & productivite',
  'Immobilier',
  'Entrepreneuriat',
  'Finance personnelle',
]

type Props = { article?: Article | null }

export function AdminArticleForm({ article }: Props) {
  const [coverUrl, setCoverUrl] = useState(article?.cover_image_url ?? '')
  const [categoryMode, setCategoryMode] = useState<'select' | 'custom'>(
    article?.category && !CATEGORIES.includes(article.category) ? 'custom' : 'select',
  )
  const [customCategory, setCustomCategory] = useState(
    article?.category && !CATEGORIES.includes(article.category) ? article.category : '',
  )
  const [selectedCategory, setSelectedCategory] = useState(
    article?.category && CATEGORIES.includes(article.category) ? article.category : CATEGORIES[0],
  )

  const categoryValue = categoryMode === 'custom' ? customCategory : selectedCategory

  return (
    <form
      action={upsertArticleAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}
    >
      {article?.id && <input type="hidden" name="id" value={article.id} />}
      <input type="hidden" name="cover_image_url" value={coverUrl} />
      <input type="hidden" name="category" value={categoryValue} />

      <Field label="Titre" name="title" defaultValue={article?.title ?? ''} required />
      <Field label="Slug (auto si vide)" name="slug" defaultValue={article?.slug ?? ''} />

      {/* Category dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Categorie</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={categoryMode === 'custom' ? '__other__' : selectedCategory}
            onChange={(e) => {
              if (e.target.value === '__other__') {
                setCategoryMode('custom')
              } else {
                setCategoryMode('select')
                setSelectedCategory(e.target.value)
              }
            }}
            style={{ ...inputStyle, flex: 1 }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__other__">Autre (saisir)</option>
          </select>
          {categoryMode === 'custom' && (
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Categorie personnalisee"
              style={{ ...inputStyle, flex: 1 }}
              required
            />
          )}
        </div>
      </div>

      <Textarea
        label="Excerpt (resume)"
        name="excerpt"
        rows={2}
        defaultValue={article?.excerpt ?? ''}
        required
      />

      {/* Cover with MediaPicker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Image de couverture</span>
        <MediaPicker value={coverUrl} onChange={setCoverUrl} />
      </div>

      <Field
        label="Auteur"
        name="author"
        defaultValue={article?.author ?? 'Hermann D. AVAHOUIN'}
      />
      <Textarea
        label="Body (markdown)"
        name="body"
        rows={20}
        defaultValue={article?.body ?? ''}
        required
      />

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <Checkbox
          label="Publie"
          name="is_published"
          defaultChecked={article?.is_published ?? false}
        />
        <Checkbox label="Featured" name="featured" defaultChecked={article?.featured ?? false} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          style={{
            background: 'var(--admin-accent)',
            color: '#0F1117',
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            fontFamily: 'var(--fb)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Enregistrer
        </button>
        {article?.id && (
          <button
            type="submit"
            formAction={deleteArticleAction}
            style={{
              background: 'transparent',
              color: '#ff9b9b',
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(255,155,155,.3)',
              fontFamily: 'var(--fb)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Supprimer
          </button>
        )}
      </div>
    </form>
  )
}

const labelStyle = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.1em',
  color: 'var(--admin-text-muted)',
  fontWeight: 600,
}

const inputStyle = {
  padding: '10px 14px',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  color: 'var(--admin-text)',
  fontFamily: 'var(--fb)',
  fontSize: 13,
} as const

function Field({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <input {...rest} style={inputStyle} />
    </label>
  )
}

function Textarea({
  label,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <textarea {...rest} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--fm)' }} />
    </label>
  )
}

function Checkbox({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: 'var(--admin-text)',
        cursor: 'pointer',
      }}
    >
      <input type="checkbox" {...rest} style={{ accentColor: '#C5A028', width: 16, height: 16 }} />
      {label}
    </label>
  )
}
