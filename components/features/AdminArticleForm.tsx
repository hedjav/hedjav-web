import { upsertArticleAction } from '@/lib/admin/actions'
import type { Article } from '@/lib/supabase/types'

type Props = { article?: Article | null }

export function AdminArticleForm({ article }: Props) {
  return (
    <form action={upsertArticleAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', maxWidth: 880 }}>
      {article?.id && <input type="hidden" name="id" value={article.id} />}

      <Field label="Titre" name="title" defaultValue={article?.title ?? ''} required />
      <Field label="Slug (auto si vide)" name="slug" defaultValue={article?.slug ?? ''} />
      <Field label="Catégorie" name="category" defaultValue={article?.category ?? ''} required />
      <Textarea label="Excerpt (résumé)" name="excerpt" rows={2} defaultValue={article?.excerpt ?? ''} required />
      <Field label="URL cover" name="cover_image_url" defaultValue={article?.cover_image_url ?? ''} />
      <Field label="Auteur" name="author" defaultValue={article?.author ?? 'Hermann D. AVAHOUIN'} />
      <Textarea label="Body (markdown)" name="body" rows={20} defaultValue={article?.body ?? ''} required />

      <div style={{ display: 'flex', gap: 'var(--s5)', alignItems: 'center' }}>
        <Checkbox label="Publié" name="is_published" defaultChecked={article?.is_published ?? false} />
        <Checkbox label="Featured" name="featured" defaultChecked={article?.featured ?? false} />
      </div>

      <button
        type="submit"
        style={{
          alignSelf: 'flex-start',
          background: '#C5A028',
          color: '#fff',
          padding: 'var(--s3) var(--s6)',
          borderRadius: 'var(--r8)',
          border: 'none',
          fontFamily: 'var(--fb)',
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          cursor: 'pointer',
        }}
      >
        Enregistrer
      </button>
    </form>
  )
}

function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{label}</span>
      <input {...rest} style={inputStyle} />
    </label>
  )
}

function Textarea({ label, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{label}</span>
      <textarea {...rest} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--fm)' }} />
    </label>
  )
}

function Checkbox({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: 'var(--text-sm)', color: '#fff', cursor: 'pointer' }}>
      <input type="checkbox" {...rest} style={{ accentColor: '#C5A028', width: 16, height: 16 }} />
      {label}
    </label>
  )
}

const inputStyle = {
  padding: 'var(--s3) var(--s4)',
  background: '#0D1628',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 'var(--r8)',
  color: '#fff',
  fontFamily: 'var(--fb)',
  fontSize: 'var(--text-sm)',
} as const
