import { NewsletterForm } from './NewsletterForm'

export function NewsletterCTA() {
  return (
    <section
      id="newsletter"
      style={{
        background: '#1B2A4A',
        color: '#E0E6EF',
        paddingBlock: 'var(--s20)',
      }}
    >
      <div className="hedjav-container" style={{ textAlign: 'center' }}>
        <span
          className="eyebrow"
          style={{ color: '#C5A028' }}
        >
          Newsletter
        </span>
        <h2
          className="h2"
          style={{ color: '#FFFFFF', marginTop: 'var(--s4)', marginBottom: 'var(--s4)' }}
        >
          Recevez nos analyses chaque semaine
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: '#C2CEDE',
            maxWidth: 560,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
            lineHeight: 1.7,
          }}
        >
          Décryptages BRVM, conseils patrimoniaux, exclusivités lecteurs.
          Une fois par semaine, dans votre boîte mail, sans bruit.
        </p>
        <NewsletterForm />
      </div>
    </section>
  )
}
