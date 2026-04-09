import { upsertArticleAction, deleteArticleAction } from '@/lib/admin/actions'
import type { Article } from '@/lib/supabase/types'

type Props = { article?: Article | null }

export function AdminArticleForm({ article }: Props) {
  return (
    <form
      action={upsertArticleAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}
    >
      {article?.id && <input type="hidden" name="id" value={article.id} />}

      <Field label="Titre" name="title" defaultValue={article?.title ?? ''} required />
      <Field label="Slug (auto si vide)" name="slug" defaultValue={article?.slug ?? ''} />
      <Field label="Catégorie" name="category" defaultValue={article?.category ?? ''} required />
      <Textarea
        label="Excerpt (résumé)"
        name="excerpt"
        rows={2}
        defaultValue={article?.excerpt ?? ''}
        required
      />
      <Field label="URL cover" name="cover_image_url" defaultValue={article?.cover_image_url ?? ''} />
      {article?.cover_image_url && (
        <div style={{ marginTop: -12 }}>
          <img
            src={article.cover_image_url}
            alt="Preview"
            style={{ height: 80, borderRadius: 6, objectFit: 'cover' }}
          />
        </div>
      )}
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
          label="Publié"
          name="is_published"
          defaultChecked={article?.is_published ?? false}
        />
        <Checkbox label="Featured" name="featured" defaultChecked={article?.featured ?? false} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          style={{
            background: '#C5A028',
            color: '#fff',
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

function Field({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: '#6B82B0',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
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
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: '#6B82B0',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
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
        color: '#E0E6EF',
        cursor: 'pointer',
      }}
    >
      <input type="checkbox" {...rest} style={{ accentColor: '#C5A028', width: 16, height: 16 }} />
      {label}
    </label>
  )
}

const inputStyle = {
  padding: '10px 14px',
  background: '#0D1628',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 8,
  color: '#E0E6EF',
  fontFamily: 'var(--fb)',
  fontSize: 13,
} as const
