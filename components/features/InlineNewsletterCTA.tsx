import { NewsletterForm } from '@/components/home/NewsletterForm'

export function InlineNewsletterCTA() {
  return (
    <aside
      style={{
        marginTop: 'var(--s16)',
        padding: 'var(--s10) var(--s8)',
        background: 'linear-gradient(135deg, #1B2A4A 0%, #0D1628 100%)',
        borderRadius: 'var(--r24)',
        border: '1px solid rgba(212,160,40,.25)',
        boxShadow: '0 24px 60px rgba(13,22,40,.35)',
        textAlign: 'center',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Or accent halo */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(197,160,40,.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <span
        className="eyebrow"
        style={{ color: '#ECCC60', position: 'relative' }}
      >
        Newsletter Hedjav
      </span>
      <h3
        className="h2"
        style={{
          marginTop: 'var(--s3)',
          marginBottom: 'var(--s4)',
          color: '#FFFFFF',
          fontSize: 'var(--text-3xl)',
          position: 'relative',
        }}
      >
        Recevez nos analyses chaque semaine
      </h3>
      <p
        style={{
          color: 'rgba(255,255,255,.75)',
          fontSize: 'var(--text-base)',
          maxWidth: 520,
          marginInline: 'auto',
          marginBottom: 'var(--s6)',
          position: 'relative',
        }}
      >
        Patrimoine, BRVM et finances personnelles : nos décryptages dans
        votre boîte mail, sans spam.
      </p>
      <div style={{ position: 'relative' }}>
        <NewsletterForm source="article" theme="dark" />
      </div>
    </aside>
  )
}
