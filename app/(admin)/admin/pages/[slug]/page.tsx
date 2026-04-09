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

export default async function AdminPageEditPage({ params }: PageProps) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  return (
    <div style={{ maxWidth: 760 }}>
      <Link
        href="/admin/pages"
        style={{ color: '#6B82B0', textDecoration: 'none', fontSize: 13, marginBottom: 24, display: 'inline-block' }}
      >
        ← Retour aux pages
      </Link>

      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 28,
          fontWeight: 600,
          color: '#fff',
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

        {/* Titre */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6B82B0', fontWeight: 600 }}>
            Titre
          </span>
          <input
            name="title"
            defaultValue={page.title}
            required
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

        {/* Slug (readonly) */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6B82B0', fontWeight: 600 }}>
            Slug
          </span>
          <input
            value={page.slug}
            readOnly
            style={{
              padding: '10px 14px',
              background: 'rgba(13,22,40,.5)',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 8,
              color: '#6B82B0',
              fontFamily: 'var(--fm)',
              fontSize: 13,
              cursor: 'not-allowed',
            }}
          />
        </label>

        {/* Body */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6B82B0', fontWeight: 600 }}>
            Contenu (Markdown)
          </span>
          <textarea
            name="body"
            defaultValue={page.body ?? ''}
            rows={20}
            style={{
              padding: '10px 14px',
              background: '#0D1628',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 8,
              color: '#E0E6EF',
              fontFamily: 'var(--fm)',
              fontSize: 13,
              resize: 'vertical',
              minHeight: 400,
            }}
          />
        </label>

        {/* Meta description */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6B82B0', fontWeight: 600 }}>
            Meta description (SEO)
          </span>
          <textarea
            name="meta_description"
            defaultValue={page.meta_description ?? ''}
            rows={3}
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
            alignSelf: 'flex-start',
          }}
        >
          Enregistrer
        </button>
      </form>
    </div>
  )
}
