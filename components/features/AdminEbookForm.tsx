import { upsertEbookAction, deleteEbookAction } from '@/lib/admin/actions'
import type { Ebook } from '@/lib/supabase/types'

type Props = { ebook?: Ebook | null }

export function AdminEbookForm({ ebook }: Props) {
  return (
    <form
      action={upsertEbookAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}
    >
      {ebook?.id && <input type="hidden" name="id" value={ebook.id} />}

      <Field label="Titre" name="title" defaultValue={ebook?.title ?? ''} required />
      <Field label="Slug (auto si vide)" name="slug" defaultValue={ebook?.slug ?? ''} />

      <Textarea
        label="Description courte"
        name="short_description"
        rows={2}
        defaultValue={ebook?.short_description ?? ''}
        required
      />
      <Textarea
        label="Description longue (markdown OK)"
        name="description"
        rows={8}
        defaultValue={ebook?.description ?? ''}
        required
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field
          label="Prix (FCFA)"
          name="price"
          type="number"
          defaultValue={String(ebook?.price ?? 4900)}
          required
        />
        <Field
          label="Prix barré (FCFA)"
          name="original_price"
          type="number"
          defaultValue={String(ebook?.original_price ?? 15000)}
          required
        />
      </div>

      <Field label="URL cover" name="cover_image_url" defaultValue={ebook?.cover_image_url ?? ''} />
      {ebook?.cover_image_url && (
        <div style={{ marginTop: -12 }}>
          <img
            src={ebook.cover_image_url}
            alt="Preview"
            style={{ height: 80, borderRadius: 6, objectFit: 'cover' }}
          />
        </div>
      )}

      <Field label="Lien FedaPay" name="fedapay_link" defaultValue={ebook?.fedapay_link ?? ''} required />

      <Textarea
        label="Features (1 par ligne)"
        name="features"
        rows={5}
        defaultValue={(ebook?.features ?? []).join('\n')}
      />
      <Textarea
        label="Public cible (1 par ligne)"
        name="target_audience"
        rows={4}
        defaultValue={(ebook?.target_audience ?? []).join('\n')}
      />

      <Field
        label="URL lead magnet (PDF gratuit)"
        name="lead_magnet_url"
        defaultValue={ebook?.lead_magnet_url ?? ''}
      />
      <Textarea
        label="Description lead magnet"
        name="lead_magnet_description"
        rows={2}
        defaultValue={ebook?.lead_magnet_description ?? ''}
      />

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <Checkbox label="Publié" name="is_published" defaultChecked={ebook?.is_published ?? false} />
        <Checkbox label="Featured" name="is_featured" defaultChecked={ebook?.is_featured ?? false} />
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
        {ebook?.id && (
          <button
            type="submit"
            formAction={deleteEbookAction}
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
      <input
        {...rest}
        style={{
          padding: '10px 14px',
          background: '#0D1628',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 8,
          color: '#E0E6EF',
          fontFamily: 'var(--fb)',
          fontSize: 13,
        }}
      />
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
      <textarea
        {...rest}
        style={{
          padding: '10px 14px',
          background: '#0D1628',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 8,
          color: '#E0E6EF',
          fontFamily: 'var(--fb)',
          fontSize: 13,
          resize: 'vertical',
        }}
      />
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
