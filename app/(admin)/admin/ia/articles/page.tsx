import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ArticleGeneratorClient } from './ArticleGeneratorClient'

export const metadata: Metadata = { title: 'Admin — Générateur articles IA' }

type SearchParams = Promise<{ document_ids?: string | string[] }>

export default async function AdminIAArticlesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const ids = parseDocumentIds(params.document_ids)

  const documents = ids.length > 0 ? await fetchDocumentTitles(ids) : []

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 4,
        }}
      >
        Générateur d&apos;articles IA
      </h1>
      <p
        style={{
          color: 'var(--admin-text-muted)',
          fontSize: 'var(--text-sm)',
          marginBottom: 'var(--s8)',
        }}
      >
        Génère un brouillon d&apos;article à partir d&apos;un sujet libre ou d&apos;un ou plusieurs documents BRVM.
        Chaque génération crée un brouillon en base avec traçabilité (provider, modèle, prompt version, sources).
      </p>
      <ArticleGeneratorClient initialDocumentIds={ids} initialDocumentTitles={documents} />
    </>
  )
}

function parseDocumentIds(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : raw.split(',')
  return list
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    .slice(0, 15)
}

async function fetchDocumentTitles(ids: string[]) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data } = await db.from('brvm_documents').select('id, title').in('id', ids)
  return (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string }))
}
