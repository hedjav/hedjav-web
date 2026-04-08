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
        <span className="eyebrow" style={{ color: '#C5A028' }}>
          Newsletter Hedjav
        </span>
        <h2
          className="h2"
          style={{ color: '#FFFFFF', marginTop: 'var(--s4)', marginBottom: 'var(--s4)' }}
        >
          Rejoignez la communauté Hedjav
        </h2>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: '#C2CEDE',
            maxWidth: 580,
            marginInline: 'auto',
            marginBottom: 'var(--s8)',
            lineHeight: 1.7,
          }}
        >
          Chaque semaine : analyses BRVM, guides patrimoniaux UEMOA et accès en
          avant-première aux nouveaux ebooks et formations de l&apos;école.
        </p>
        <NewsletterForm />
      </div>
    </section>
  )
}
