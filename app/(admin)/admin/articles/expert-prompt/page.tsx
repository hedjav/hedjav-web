import type { Metadata } from 'next'
import Link from 'next/link'
import { getConfig } from '@/lib/config/queries'
import { saveExpertPromptAction } from './actions'

export const metadata: Metadata = { title: 'Admin — Prompt expert articles' }
export const dynamic = 'force-dynamic'

export default async function ExpertPromptPage() {
  const current = (await getConfig('articles_expert_prompt')) ?? ''
  const isSet = current.trim().length > 0

  return (
    <>
      <Link
        href="/admin/articles"
        style={{ color: 'var(--admin-text-muted)', fontSize: 13, marginBottom: 16, display: 'inline-block' }}
      >
        ← Retour aux articles
      </Link>
      <h1
        style={{
          fontFamily: 'var(--fd)',
          fontSize: 'var(--text-4xl)',
          fontWeight: 600,
          color: 'var(--admin-text)',
          marginBottom: 4,
        }}
      >
        Prompt expert — articles
      </h1>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s8)' }}>
        Ce texte est ajouté en <strong>3ème couche</strong> du system prompt de TOUTES les générations d&apos;articles
        (angles, titres, brouillon, scoring). Utile pour injecter les instructions d&apos;un analyste financier
        sans redéployer de code. Laisser vide si pas encore fourni.
      </p>

      <div
        style={{
          padding: 14,
          background: isSet ? 'rgba(34,197,94,.08)' : 'rgba(245,158,11,.08)',
          border: `1px solid ${isSet ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`,
          borderRadius: 10,
          color: isSet ? 'var(--admin-success)' : 'var(--admin-warning)',
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        {isSet
          ? '✓ Prompt expert actif — il enrichit chaque appel IA articles (couche 3 du system prompt).'
          : 'Aucun prompt expert n\'est actuellement défini. Le système tourne avec ses deux couches internes (base Hedjav + instructions spécifiques à la tâche).'}
      </div>

      <form action={saveExpertPromptAction} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              color: 'var(--admin-text-muted)',
              fontWeight: 600,
            }}
          >
            Prompt expert
          </span>
          <textarea
            name="prompt"
            defaultValue={current}
            rows={20}
            placeholder={PLACEHOLDER}
            style={{
              padding: '14px 16px',
              background: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: 10,
              color: 'var(--admin-text)',
              fontFamily: 'var(--fm)',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            style={{
              background: 'var(--admin-accent)',
              color: '#0F1117',
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              fontFamily: 'var(--fb)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Enregistrer
          </button>
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
            Le cache interne est invalidé immédiatement — le prochain appel IA utilisera la nouvelle version.
          </span>
        </div>
      </form>

      <details style={{ marginTop: 40, color: 'var(--admin-text-muted)', fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--admin-text)' }}>
          Comment fonctionne cette couche ?
        </summary>
        <div style={{ marginTop: 12, lineHeight: 1.7 }}>
          <p>
            Chaque appel IA construit son system prompt en combinant trois couches, dans cet ordre :
          </p>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>
              <strong>Base Hedjav</strong> (interne, code) : cadre éditorial, public UEMOA, règles d&apos;intégrité.
            </li>
            <li>
              <strong>Instructions spécifiques à la tâche</strong> (interne, code) : format JSON attendu,
              contraintes propres aux angles / titres / brouillon / scoring.
            </li>
            <li>
              <strong>Prompt expert</strong> (cette page, optionnel) : règles métier d&apos;un analyste financier.
              Placées en dernier → elles <em>dominent</em> en cas de conflit avec les deux premières couches.
            </li>
          </ol>
          <p style={{ marginTop: 10 }}>
            Tant que cette case est vide, la couche 3 est désactivée et rien n&apos;est ajouté au system prompt.
          </p>
        </div>
      </details>
    </>
  )
}

const PLACEHOLDER = `Exemple (à remplacer par le vrai prompt de l'expert) :

Tu es analyste financier senior de la BRVM avec 20 ans d'expérience sur les marchés UEMOA.
- Privilégie toujours l'analyse fondamentale sur le trading spéculatif.
- Quand tu cites un secteur, relie-le aux indices sectoriels BRVM (BRVM-FINANCE, BRVM-IND…).
- Pour un article patrimoine, rappelle systématiquement le contexte OHADA.
- Évite tout jargon qui ne serait pas compris par un entrepreneur UEMOA moyen.
- Si le contexte contient un rapport annuel, extrais-en 1 ou 2 ratios clés (ROE, BPA, PER) avant d'écrire.`
