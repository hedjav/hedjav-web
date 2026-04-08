import { upsertEbookAction } from '@/lib/admin/actions'
import type { Ebook } from '@/lib/supabase/types'

type Props = { ebook?: Ebook | null }

export function AdminEbookForm({ ebook }: Props) {
  return (
    <form action={upsertEbookAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', maxWidth: 760 }}>
      {ebook?.id && <input type="hidden" name="id" value={ebook.id} />}

      <Field label="Titre" name="title" defaultValue={ebook?.title ?? ''} required />
      <Field label="Slug (auto si vide)" name="slug" defaultValue={ebook?.slug ?? ''} />

      <Textarea label="Description courte" name="short_description" rows={2} defaultValue={ebook?.short_description ?? ''} required />
      <Textarea label="Description longue (markdown OK)" name="description" rows={8} defaultValue={ebook?.description ?? ''} required />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
        <Field label="Prix (FCFA)" name="price" type="number" defaultValue={String(ebook?.price ?? 4900)} required />
        <Field label="Prix barré (FCFA)" name="original_price" type="number" defaultValue={String(ebook?.original_price ?? 15000)} required />
      </div>

      <Field label="URL cover" name="cover_image_url" defaultValue={ebook?.cover_image_url ?? ''} />
      <Field label="Lien FedaPay" name="fedapay_link" defaultValue={ebook?.fedapay_link ?? ''} required />

      <Textarea label="Features (1 par ligne)" name="features" rows={5} defaultValue={(ebook?.features ?? []).join('\n')} />
      <Textarea label="Public cible (1 par ligne)" name="target_audience" rows={4} defaultValue={(ebook?.target_audience ?? []).join('\n')} />

      <div style={{ display: 'flex', gap: 'var(--s5)', alignItems: 'center' }}>
        <Checkbox label="Publié" name="is_published" defaultChecked={ebook?.is_published ?? false} />
        <Checkbox label="Featured" name="is_featured" defaultChecked={ebook?.is_featured ?? false} />
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
      <input
        {...rest}
        style={{
          padding: 'var(--s3) var(--s4)',
          background: '#0D1628',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 'var(--r8)',
          color: '#fff',
          fontFamily: 'var(--fb)',
          fontSize: 'var(--text-sm)',
        }}
      />
    </label>
  )
}

function Textarea({ label, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{label}</span>
      <textarea
        {...rest}
        style={{
          padding: 'var(--s3) var(--s4)',
          background: '#0D1628',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 'var(--r8)',
          color: '#fff',
          fontFamily: 'var(--fb)',
          fontSize: 'var(--text-sm)',
          resize: 'vertical',
        }}
      />
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
