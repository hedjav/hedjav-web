import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Merci pour votre achat',
  description: 'Votre paiement a bien été enregistré.',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ ref?: string; status?: string }>
}

export default async function MerciPage({ searchParams }: PageProps) {
  const { ref } = await searchParams

  let purchaseStatus: string | null = null
  let ebookTitle: string | null = null

  if (ref) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('purchases')
      .select('status, ebook:ebooks(title)')
      .eq('payment_ref', ref)
      .maybeSingle()
    if (data) {
      purchaseStatus = data.status as string
      ebookTitle = (data.ebook as { title?: string } | null)?.title ?? null
    }
  }

  const isPaid = purchaseStatus === 'paid'

  return (
    <section className="section">
      <div className="hedjav-container" style={{ maxWidth: 640, textAlign: 'center' }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 'var(--rfull)',
            background: isPaid ? 'var(--g100)' : 'var(--n100)',
            color: isPaid ? 'var(--g700)' : 'var(--n700)',
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
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>

        <span className="eyebrow">{isPaid ? 'Confirmé' : 'En attente'}</span>
        <h1 className="h1" style={{ marginTop: 'var(--s4)', fontSize: 'clamp(var(--text-3xl), 5vw, var(--text-5xl))' }}>
          {isPaid ? 'Merci pour votre confiance' : 'Paiement en cours de traitement'}
        </h1>

        <p style={{ marginTop: 'var(--s5)', color: 'var(--muted)', fontSize: 'var(--text-lg)' }}>
          {isPaid && ebookTitle && (
            <>Votre achat de <strong>{ebookTitle}</strong> a bien été enregistré. </>
          )}
          {isPaid
            ? 'Un email de confirmation avec votre ebook vient de vous être envoyé.'
            : "Nous attendons la confirmation de FedaPay. Vous recevrez un email dès que le paiement sera validé."}
        </p>

        <div style={{ marginTop: 'var(--s10)', display: 'flex', gap: 'var(--s3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard/mes-ebooks" className="btn btn-gold">
            Voir mes ebooks
          </Link>
          <Link href="/ebooks" className="btn btn-outline">
            Continuer le catalogue
          </Link>
        </div>
      </div>
    </section>
  )
}
