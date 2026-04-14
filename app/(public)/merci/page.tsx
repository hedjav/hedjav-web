import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { MerciAutoRefresh } from './MerciAutoRefresh'

export const metadata: Metadata = {
  title: 'Merci pour votre achat',
  description: 'Votre paiement a bien été enregistré.',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ purchase_id?: string; ref?: string }>
}

export default async function MerciPage({ searchParams }: PageProps) {
  const params = await searchParams
  const purchaseId = params.purchase_id ?? params.ref ?? null

  let purchaseStatus: string | null = null
  let ebookTitle: string | null = null
  let ebookSlug: string | null = null
  let purchasedEbookId: string | null = null

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  if (purchaseId) {
    const { data } = await db
      .from('purchases')
      .select('status, ebook_id, ebook:ebooks(title, slug)')
      .eq('id', purchaseId)
      .maybeSingle()

    if (data) {
      purchaseStatus = data.status as string
      const ebook = data.ebook as { title?: string; slug?: string } | null
      ebookTitle = ebook?.title ?? null
      ebookSlug = ebook?.slug ?? null
      purchasedEbookId = (data.ebook_id as string | null) ?? null
    }
  }

  const isPaid = purchaseStatus === 'paid'
  const isPending = purchaseStatus === 'pending'
  const isFailed = purchaseStatus === 'failed'

  // Cross-sell : 3 autres ebooks publiés (exclut celui qui vient d'être acheté)
  type CrossSell = { id: string; slug: string; title: string; price: number; cover: string | null }
  let crossSell: CrossSell[] = []
  if (isPaid) {
    let q = db
      .from('ebooks')
      .select('id, slug, title, price, cover')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3)
    if (purchasedEbookId) q = q.neq('id', purchasedEbookId)
    const { data } = await q
    crossSell = ((data as CrossSell[] | null) ?? []).slice(0, 3)
  }

  return (
    <section className="section">
      <div className="hedjav-container" style={{ maxWidth: 640, textAlign: 'center' }}>
        {/* Auto-refresh côté client pour les paiements en attente */}
        {isPending && <MerciAutoRefresh />}

        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 'var(--rfull)',
            background: isPaid ? 'var(--g100)' : isFailed ? 'rgba(220,38,38,.1)' : 'var(--n100)',
            color: isPaid ? 'var(--g700)' : isFailed ? '#dc2626' : 'var(--n700)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--s8)',
          }}
          aria-hidden
        >
          {isPaid ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : isFailed ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>

        <span className="eyebrow">
          {isPaid ? 'Confirmé' : isFailed ? 'Échoué' : 'En attente'}
        </span>

        <h1 className="h1" style={{ marginTop: 'var(--s4)', fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))' }}>
          {isPaid
            ? 'Merci pour votre confiance'
            : isFailed
            ? 'Paiement échoué'
            : purchaseId
            ? 'Paiement en cours de vérification...'
            : 'Merci !'}
        </h1>

        <p style={{ marginTop: 'var(--s5)', color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
          {isPaid && ebookTitle && (
            <>Votre achat de <strong>{ebookTitle}</strong> a bien été enregistré. </>
          )}
          {isPaid
            ? 'Un email de confirmation avec votre ebook vient de vous être envoyé.'
            : isFailed
            ? "Le paiement n'a pas abouti. Vous pouvez réessayer depuis la page de l'ebook."
            : purchaseId
            ? 'Nous attendons la confirmation de FedaPay. Cette page se rafraîchit automatiquement toutes les 5 secondes.'
            : 'Merci de votre visite sur Hedjav.'}
        </p>

        {isPending && (
          <p style={{ marginTop: 'var(--s4)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            Si le paiement a été effectué, la confirmation arrivera dans quelques instants.
            Vous recevrez aussi un email de confirmation.
          </p>
        )}

        <div style={{ marginTop: 'var(--s10)', display: 'flex', gap: 'var(--s3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isPaid && (
            <Link href="/dashboard/mes-ebooks" className="btn btn-gold">
              Voir mes ebooks
            </Link>
          )}
          {isFailed && ebookSlug && (
            <Link href={`/ebooks/${ebookSlug}`} className="btn btn-gold">
              Réessayer l&apos;achat
            </Link>
          )}
          {!isPaid && !isFailed && (
            <Link href="/dashboard/mes-ebooks" className="btn btn-gold">
              Voir mes ebooks
            </Link>
          )}
          <Link href="/ebooks" className="btn btn-outline">
            Continuer le catalogue
          </Link>
        </div>
      </div>

      {/* Cross-sell : ne s'affiche que sur paiement confirmé + 1+ autre ebook publié */}
      {isPaid && crossSell.length > 0 && (
        <div
          className="hedjav-container"
          style={{ maxWidth: 960, marginTop: 'var(--s12)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--s6)' }}>
            <span className="eyebrow">À découvrir aussi</span>
            <h2
              className="h2"
              style={{ marginTop: 'var(--s3)', fontSize: 'clamp(var(--text-2xl), 4vw, var(--text-4xl))' }}
            >
              Prolongez votre élan
            </h2>
            <p style={{ marginTop: 'var(--s3)', color: 'var(--muted)', fontSize: 'var(--text-base)' }}>
              D&apos;autres guides pratiques Hedjav pour avancer sur votre plan patrimonial.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--s4)',
            }}
          >
            {crossSell.map((b) => (
              <Link
                key={b.id}
                href={`/ebooks/${b.slug}`}
                style={{
                  display: 'block',
                  background: 'var(--n50)',
                  border: '1px solid var(--n200)',
                  borderRadius: 'var(--r2)',
                  padding: 'var(--s5)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color .15s, transform .15s',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--fd)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    color: 'var(--n900)',
                    lineHeight: 1.3,
                    marginBottom: 'var(--s3)',
                  }}
                >
                  {b.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--g700)',
                    fontWeight: 600,
                  }}
                >
                  {b.price.toLocaleString('fr-FR')} F CFA
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 'var(--s3)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--g700)',
                    fontWeight: 500,
                  }}
                >
                  Découvrir →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
