import { NewsletterForm } from '@/components/home/NewsletterForm'

export function InlineNewsletterCTA() {
  return (
    <aside
      style={{
        marginTop: 'var(--s16)',
        padding: 'var(--s10) var(--s8)',
        background: 'var(--n900)',
        borderRadius: 'var(--r24)',
        textAlign: 'center',
        color: '#fff',
      }}
    >
      <span className="eyebrow" style={{ color: 'var(--g400)' }}>Newsletter</span>
      <h3
        className="h2"
        style={{
          marginTop: 'var(--s3)',
          marginBottom: 'var(--s4)',
          color: '#fff',
          fontSize: 'var(--text-3xl)',
        }}
      >
        Recevez nos analyses chaque semaine
      </h3>
      <p
        style={{
          color: 'rgba(255,255,255,.7)',
          fontSize: 'var(--text-base)',
          maxWidth: 520,
          marginInline: 'auto',
          marginBottom: 'var(--s6)',
        }}
      >
        Patrimoine, BRVM et finances personnelles : nos décryptages dans
        votre boîte mail, sans spam.
      </p>
      <NewsletterForm source="article" theme="dark" />
    </aside>
  )
}
