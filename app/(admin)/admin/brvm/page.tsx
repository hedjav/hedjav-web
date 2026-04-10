import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BRVMTriggerButton } from './BRVMTriggerButton'

export const metadata: Metadata = { title: 'Admin — Veille BRVM' }

async function getBRVMArticles() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await db
    .from('articles')
    .select('id, title, source, quality_score, is_published, created_at')
    .eq('category', 'BRVM')
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export default async function AdminBRVMPage() {
  const articles = await getBRVMArticles()

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s8)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--admin-text)' }}>
            Veille BRVM
          </h1>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Scraping automatique des donnees BRVM et generation d&apos;articles.
          </p>
        </div>
        <BRVMTriggerButton />
      </div>

      {/* Articles table */}
      <div style={{ background: 'var(--admin-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--admin-text)' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.2)' }}>
              {['Titre', 'Source', 'Score', 'Statut', 'Date'].map((h) => (
                <th key={h} style={{ padding: 'var(--s3) var(--s4)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 600 }}>
                  <Link href={`/admin/articles/${a.id}`} style={{ color: 'var(--admin-text)', textDecoration: 'none' }}>
                    {a.title}
                  </Link>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: a.source === 'ai' ? 'rgba(197,160,40,.15)' : 'rgba(59,130,246,.15)',
                    color: a.source === 'ai' ? 'var(--admin-accent)' : 'var(--admin-info)',
                  }}>
                    {a.source}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  {a.quality_score != null ? (
                    <span style={{
                      padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--fm)',
                      background: a.quality_score < 40 ? 'rgba(239,68,68,.15)' : a.quality_score < 70 ? 'rgba(245,158,11,.15)' : 'rgba(34,197,94,.15)',
                      color: a.quality_score < 40 ? 'var(--admin-danger)' : a.quality_score < 70 ? 'var(--admin-warning)' : 'var(--admin-success)',
                    }}>
                      {a.quality_score}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{'\u2014'}</span>
                  )}
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                    background: a.is_published ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)',
                    color: a.is_published ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                  }}>
                    {a.is_published ? 'Publie' : 'Brouillon'}
                  </span>
                </td>
                <td style={{ padding: 'var(--s3) var(--s4)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Aucun article BRVM</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
