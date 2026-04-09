import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

type PageProps = { params: Promise<{ slug: string }> }

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getPage(slug: string) {
  const db = getDb()
  const { data } = await db
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

async function updatePageAction(formData: FormData) {
  'use server'

  const slug = String(formData.get('slug') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const meta_description = String(formData.get('meta_description') ?? '').trim()

  if (!slug || !title) return

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  await db
    .from('pages')
    .update({ title, body, meta_description, updated_at: new Date().toISOString() })
    .eq('slug', slug)

  revalidatePath(`/admin/pages/${slug}`)
  revalidatePath(`/${slug}`)
  redirect('/admin/pages')
}

const labelStyle = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }
const fieldInputStyle = {
  padding: '10px 14px',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  color: 'var(--admin-text)',
  fontFamily: 'var(--fb)',
  fontSize: 13,
}

export default async function AdminPageEditPage({ params }: PageProps) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  return (
    <div style={{ maxWidth: 760 }}>
      <Link
        href="/admin/pages"
        style={{ color: 'var(--admin-text-muted)', textDecoration: 'none', fontSize: 13, marginBottom: 24, display: 'inline-block' }}
      >
        ← Retour aux pages
      </Link>

      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 32,
        }}
      >
        Modifier : {page.title}
      </h1>

      <form
        action={updatePageAction}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <input type="hidden" name="slug" value={page.slug} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Titre</span>
          <input name="title" defaultValue={page.title} required style={fieldInputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Slug</span>
          <input
            value={page.slug}
            readOnly
            style={{
              ...fieldInputStyle,
              background: 'rgba(13,22,40,.5)',
              color: 'var(--admin-text-muted)',
              fontFamily: 'var(--fm)',
              cursor: 'not-allowed',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Contenu (Markdown)</span>
          <textarea
            name="body"
            defaultValue={page.body ?? ''}
            rows={20}
            style={{
              ...fieldInputStyle,
              fontFamily: 'var(--fm)',
              resize: 'vertical',
              minHeight: 400,
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Meta description (SEO)</span>
          <textarea
            name="meta_description"
            defaultValue={page.meta_description ?? ''}
            rows={3}
            style={{
              ...fieldInputStyle,
              resize: 'vertical',
            }}
          />
        </label>

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
            alignSelf: 'flex-start',
          }}
        >
          Enregistrer
        </button>
      </form>
    </div>
  )
}
