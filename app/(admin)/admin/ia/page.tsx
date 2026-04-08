import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — Outils IA' }

const TOOLS = [
  { name: 'Génération d’articles', desc: 'Générer un nouvel article via Claude API à partir d’un brief.', status: 'planned' },
  { name: 'Scoring qualité', desc: 'Évaluer automatiquement la qualité des articles (score 0-100).', status: 'planned' },
  { name: 'Publication automatique', desc: 'Publier automatiquement les articles dont le score dépasse un seuil.', status: 'planned' },
  { name: 'Génération de covers', desc: 'Créer une image de couverture SVG/PNG à partir du titre.', status: 'planned' },
  { name: 'Génération d’ebooks', desc: 'Compiler un ebook complet à partir d’une série de prompts.', status: 'planned' },
  { name: 'Veille BRVM automatique', desc: 'Scraper et résumer chaque jour les actualités BRVM.', status: 'planned' },
  { name: 'Réponses commentaires', desc: 'Pré-rédiger des réponses aux commentaires des lecteurs.', status: 'planned' },
] as const

export default function AdminIAPage() {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--s4)' }}>
        Outils IA
      </h1>
      <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 'var(--s10)', maxWidth: 720 }}>
        Architecture déjà prête côté Supabase (champs <code style={{ color: '#C5A028' }}>source</code>,{' '}
        <code style={{ color: '#C5A028' }}>quality_score</code>, <code style={{ color: '#C5A028' }}>metadata jsonb</code>) et
        côté API (<code style={{ color: '#C5A028' }}>POST /api/articles</code> avec bearer token).
        Les outils ci-dessous viendront se brancher sans toucher au schéma.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--s5)',
        }}
      >
        {TOOLS.map((t) => (
          <div
            key={t.name}
            style={{
              background: '#1B2A4A',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 'var(--r16)',
              padding: 'var(--s6)',
              opacity: 0.7,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 'var(--text-xl)', color: '#fff' }}>{t.name}</h3>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(197,160,40,.15)',
                  color: '#C5A028',
                  fontWeight: 600,
                }}
              >
                Bientôt
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 'var(--text-sm)' }}>{t.desc}</p>
            <button
              type="button"
              disabled
              style={{
                marginTop: 'var(--s5)',
                padding: 'var(--s2) var(--s4)',
                background: 'transparent',
                border: '1px solid rgba(197,160,40,.3)',
                color: '#C5A028',
                borderRadius: 'var(--r8)',
                fontFamily: 'var(--fb)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'not-allowed',
              }}
            >
              Lancer (à venir)
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
