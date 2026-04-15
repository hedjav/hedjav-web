'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/lib/articles/categories'
import type { ArticleAngle, ArticleTitleIdea } from '@/lib/articles/types'

type Props = {
  initialDocumentIds?: string[]
  initialDocumentTitles?: Array<{ id: string; title: string }>
}

type GenerationStep = 'compose' | 'choosing-angle' | 'choosing-title' | 'done'

type GeneratedDraft = {
  id: string
  slug: string
  title: string
  provider: string | null
  model: string | null
}

/**
 * Wizard de génération d'articles.
 *
 * Deux modes en un seul écran :
 *   - Mode rapide : sujet / docs → bouton "Brouillon direct"
 *   - Mode itératif : sujet / docs → angles → titres → brouillon
 *
 * L'admin choisit. Pas de tunnel rigide imposé.
 */
export function ArticleGeneratorClient({
  initialDocumentIds = [],
  initialDocumentTitles = [],
}: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<ArticleCategory | ''>('')
  const [instructions, setInstructions] = useState('')
  const [documentIds] = useState<string[]>(initialDocumentIds)
  const [documentTitles] = useState(initialDocumentTitles)

  const [step, setStep] = useState<GenerationStep>('compose')
  const [busy, setBusy] = useState<null | 'angles' | 'titles' | 'draft'>(null)
  const [error, setError] = useState<string | null>(null)

  const [angles, setAngles] = useState<ArticleAngle[]>([])
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null)
  const [titles, setTitles] = useState<ArticleTitleIdea[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [draft, setDraft] = useState<GeneratedDraft | null>(null)

  const hasSubject = subject.trim().length > 0
  const hasDocs = documentIds.length > 0

  const bodyBase = useMemo(
    () => ({
      subject: subject.trim() || undefined,
      category: category || undefined,
      instructions: instructions.trim() || undefined,
      brvm_document_ids: hasDocs ? documentIds : undefined,
    }),
    [subject, category, instructions, documentIds, hasDocs]
  )

  async function callApi<T>(path: string, extra: Record<string, unknown> = {}) {
    setError(null)
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyBase, ...extra }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `Erreur ${res.status}`)
    }
    return data as T
  }

  async function handleAngles() {
    setBusy('angles')
    try {
      const data = await callApi<{ content: ArticleAngle[] }>('/api/admin/articles/ai/angles')
      setAngles(data.content)
      setStep('choosing-angle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setBusy(null)
  }

  async function handleTitles(angle?: string) {
    setBusy('titles')
    try {
      const data = await callApi<{ content: ArticleTitleIdea[] }>(
        '/api/admin/articles/ai/titles',
        angle ? { angle } : {}
      )
      setTitles(data.content)
      setSelectedAngle(angle ?? null)
      setStep('choosing-title')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setBusy(null)
  }

  async function handleDraft(opts: { angle?: string; title?: string } = {}) {
    setBusy('draft')
    try {
      const data = await callApi<GeneratedDraft & { ok: true }>('/api/admin/articles/ai/draft', opts)
      setDraft({
        id: data.id,
        slug: data.slug,
        title: data.title,
        provider: data.provider,
        model: data.model,
      })
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setBusy(null)
  }

  const canStart = hasSubject || hasDocs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      {hasDocs && (
        <div style={docBannerStyle}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--admin-accent)', marginBottom: 6 }}>
            Source BRVM ({documentIds.length} document{documentIds.length > 1 ? 's' : ''})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--admin-text)' }}>
            {documentTitles.slice(0, 5).map((d) => (
              <li key={d.id}>{d.title}</li>
            ))}
            {documentTitles.length > 5 && (
              <li style={{ color: 'var(--admin-text-muted)' }}>… et {documentTitles.length - 5} de plus</li>
            )}
          </ul>
        </div>
      )}

      <Card title="1. Contexte">
        <Field label="Sujet (optionnel si documents BRVM fournis)">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Comment choisir un ETF en zone UEMOA"
            style={inputStyle}
          />
        </Field>
        <Field label="Catégorie pressentie">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ArticleCategory | '')}
            style={inputStyle}
          >
            <option value="">— Laisser l'IA décider —</option>
            {ARTICLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Instructions supplémentaires (optionnel)">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ex : Angle débutant, 3 exemples concrets Côte d'Ivoire, conclusion avec 3 étapes actionnables."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
      </Card>

      <Card title="2. Méthode">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PrimaryButton
            disabled={!canStart || busy !== null}
            onClick={() => handleDraft()}
            label={busy === 'draft' ? 'Génération…' : 'Brouillon direct (rapide)'}
          />
          <SecondaryButton
            disabled={!canStart || busy !== null}
            onClick={handleAngles}
            label={busy === 'angles' ? 'Angles…' : 'Passer par angles & titres (itératif)'}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: '8px 0 0' }}>
          Mode rapide = 1 appel IA. Mode itératif = 3 appels (angles → titres → brouillon), meilleur pour cadrer un sujet.
        </p>
      </Card>

      {step === 'choosing-angle' && (
        <Card title="3. Choix d'un angle">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {angles.map((a) => (
              <OptionCard
                key={a.id}
                title={a.angle}
                subtitle={`${a.audience}${a.why_now ? ` · ${a.why_now}` : ''}`}
                onClick={() => handleTitles(a.angle)}
                busy={busy === 'titles'}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 10 }}>
            Tu peux aussi sauter cette étape :{' '}
            <button onClick={() => handleDraft()} style={inlineLinkStyle}>
              générer directement un brouillon
            </button>
            .
          </p>
        </Card>
      )}

      {step === 'choosing-title' && (
        <Card title="4. Choix d'un titre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {titles.map((t) => (
              <OptionCard
                key={t.title}
                title={t.title}
                subtitle={t.hook}
                chips={t.seo_keywords}
                onClick={() => handleDraft({ angle: selectedAngle ?? undefined, title: t.title })}
                busy={busy === 'draft'}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 10 }}>
            <button
              onClick={() => handleDraft({ angle: selectedAngle ?? undefined })}
              style={inlineLinkStyle}
            >
              Passer — laisser l'IA choisir le titre final
            </button>
          </p>
        </Card>
      )}

      {step === 'done' && draft && (
        <Card title="Brouillon créé">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text)', marginBottom: 4 }}>
            {draft.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 16 }}>
            Provider : {draft.provider ?? 'n/a'} · Modèle : {draft.model ?? 'n/a'} · Statut initial : brouillon
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PrimaryButton
              onClick={() => router.push(`/admin/articles/${draft.id}`)}
              label="Ouvrir pour relecture"
              disabled={false}
            />
            <SecondaryButton
              onClick={() => {
                setDraft(null)
                setStep('compose')
                setAngles([])
                setTitles([])
                setSelectedAngle(null)
                setSelectedTitle(null)
              }}
              label="Générer un autre"
              disabled={false}
            />
          </div>
        </Card>
      )}

      {error && (
        <div
          style={{
            padding: 14,
            background: 'rgba(239,68,68,.08)',
            border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 10,
            color: '#ff9b9b',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components & styles ────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          color: 'var(--admin-text-muted)',
          marginBottom: 14,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: 'var(--admin-accent)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function OptionCard({
  title,
  subtitle,
  chips,
  onClick,
  busy,
}: {
  title: string
  subtitle?: string
  chips?: string[]
  onClick: () => void
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        border: '1px solid var(--admin-border)',
        borderRadius: 10,
        background: 'var(--admin-bg)',
        color: 'var(--admin-text)',
        cursor: busy ? 'wait' : 'pointer',
        fontFamily: 'var(--fb)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{subtitle}</div>
      )}
      {chips && chips.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(197,160,40,.15)',
                color: 'var(--admin-accent)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function PrimaryButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void
  label: string
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(197,160,40,.3)' : 'var(--admin-accent)',
        color: '#0F1117',
        padding: '10px 18px',
        borderRadius: 8,
        border: 'none',
        fontWeight: 600,
        fontSize: 13,
        fontFamily: 'var(--fb)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function SecondaryButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void
  label: string
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        color: 'var(--admin-text)',
        padding: '10px 18px',
        borderRadius: 8,
        border: '1px solid var(--admin-border)',
        fontWeight: 600,
        fontSize: 13,
        fontFamily: 'var(--fb)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  color: 'var(--admin-text)',
  fontFamily: 'var(--fb)',
  fontSize: 13,
  boxSizing: 'border-box',
}

const docBannerStyle: React.CSSProperties = {
  padding: 16,
  background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)',
  borderRadius: 12,
}

const inlineLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--admin-accent)',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'var(--fb)',
  fontSize: 'inherit',
}
