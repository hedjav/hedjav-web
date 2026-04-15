'use client'

import { useState } from 'react'

type DigestKind =
  | 'admin_alert'
  | 'daily_digest'
  | 'weekly_digest'
  | 'monthly_digest'

type DigestResponse = {
  ok: boolean
  use_case: string
  provider: string | null
  model: string | null
  content: string | null
  error?: string
  skipped?: boolean
  context_summary: {
    total_docs: number
    period_label: string
    families_touched: string[]
    top_sectors: string[]
  }
}

type ArticleDraftResponse = {
  ok: boolean
  use_case: string
  provider: string | null
  model: string | null
  content: { title: string; excerpt: string; category: string; body: string } | null
  error?: string
  skipped?: boolean
  context_summary: DigestResponse['context_summary']
}

type Suggestion = {
  title: string
  angle: string
  priority: 'high' | 'medium' | 'low'
  category: string
  universe: string
  inspiration_docs: string[]
}

type SuggestionsResponse = {
  ok: boolean
  use_case: string
  provider: string | null
  model: string | null
  content: Suggestion[] | null
  error?: string
  skipped?: boolean
  context_summary: DigestResponse['context_summary']
}

const DIGEST_LABELS: Record<DigestKind, string> = {
  admin_alert: "Alerte admin (maintenant)",
  daily_digest: 'Digest journalier',
  weekly_digest: 'Digest hebdomadaire',
  monthly_digest: 'Digest mensuel',
}

const PERIOD_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '3m': '3 derniers mois',
  all: 'Tout l’historique',
}

type Status = { busy: boolean; error?: string | null }

export function BrvmAiClient({ aiAvailable }: { aiAvailable: boolean }) {
  const [digestKind, setDigestKind] = useState<DigestKind>('daily_digest')
  const [digestStatus, setDigestStatus] = useState<Status>({ busy: false })
  const [digestResult, setDigestResult] = useState<DigestResponse | null>(null)

  const [articleTopic, setArticleTopic] = useState('')
  const [articlePeriod, setArticlePeriod] = useState('7d')
  const [articleStatus, setArticleStatus] = useState<Status>({ busy: false })
  const [articleResult, setArticleResult] = useState<ArticleDraftResponse | null>(null)

  const [suggPeriod, setSuggPeriod] = useState('7d')
  const [suggStatus, setSuggStatus] = useState<Status>({ busy: false })
  const [suggResult, setSuggResult] = useState<SuggestionsResponse | null>(null)

  async function callDigest() {
    setDigestStatus({ busy: true })
    setDigestResult(null)
    try {
      const res = await fetch('/api/brvm/ai/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: digestKind }),
      })
      const data = (await res.json()) as DigestResponse
      setDigestResult(data)
      setDigestStatus({ busy: false, error: data.ok ? null : data.error ?? 'Erreur IA' })
    } catch (e) {
      setDigestStatus({ busy: false, error: e instanceof Error ? e.message : 'Erreur' })
    }
  }

  async function callArticle() {
    setArticleStatus({ busy: true })
    setArticleResult(null)
    try {
      const res = await fetch('/api/brvm/ai/article-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: articleTopic || undefined,
          period: articlePeriod,
        }),
      })
      const data = (await res.json()) as ArticleDraftResponse
      setArticleResult(data)
      setArticleStatus({ busy: false, error: data.ok ? null : data.error ?? 'Erreur IA' })
    } catch (e) {
      setArticleStatus({ busy: false, error: e instanceof Error ? e.message : 'Erreur' })
    }
  }

  async function callSuggestions() {
    setSuggStatus({ busy: true })
    setSuggResult(null)
    try {
      const res = await fetch('/api/brvm/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: suggPeriod }),
      })
      const data = (await res.json()) as SuggestionsResponse
      setSuggResult(data)
      setSuggStatus({ busy: false, error: data.ok ? null : data.error ?? 'Erreur IA' })
    } catch (e) {
      setSuggStatus({ busy: false, error: e instanceof Error ? e.message : 'Erreur' })
    }
  }

  if (!aiAvailable) {
    return (
      <div
        style={{
          background: 'color-mix(in srgb, #B23A48 10%, var(--admin-surface))',
          border: '1px solid #B23A48',
          borderRadius: 12,
          padding: 'var(--s5)',
          fontSize: 13.5,
          color: 'var(--admin-text)',
        }}
      >
        <strong>IA non configurée.</strong> Renseigne une clé dans <code>.env.local</code>{' '}
        : <code>DEEPSEEK_API_KEY</code> (prioritaire), <code>OPENAI_API_KEY</code> ou{' '}
        <code>ANTHROPIC_API_KEY</code>. La couche IA accepte les trois providers via la façade
        unifiée <code>lib/ai/client.ts</code>.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s5)' }}>
      {/* P1 + P2 — Alertes / Digests */}
      <Card
        title="Alerte admin & digests"
        subtitle="Synthèse IA enrichie à partir de la veille BRVM (4 univers)."
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={digestKind}
            onChange={(e) => setDigestKind(e.target.value as DigestKind)}
            style={selectStyle}
          >
            {(Object.keys(DIGEST_LABELS) as DigestKind[]).map((k) => (
              <option key={k} value={k}>
                {DIGEST_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={callDigest}
            disabled={digestStatus.busy}
            style={primaryButton(digestStatus.busy)}
          >
            {digestStatus.busy ? 'Génération…' : 'Générer'}
          </button>
          {digestStatus.error && <ErrorTag message={digestStatus.error} />}
        </div>

        {digestResult?.ok && digestResult.content && (
          <ResultBlock
            contextLabel={`${digestResult.context_summary.period_label} · ${digestResult.context_summary.total_docs} docs`}
            provider={digestResult.provider}
            content={digestResult.content}
          />
        )}
      </Card>

      {/* P3 — Brouillon d'article */}
      <Card
        title="Brouillon d'article"
        subtitle="Article publiable (500-900 mots) au format JSON, prêt à relire + publier."
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={articleTopic}
            onChange={(e) => setArticleTopic(e.target.value)}
            placeholder="Sujet (optionnel) — ex : « Notation financière Sonatel »"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={articlePeriod}
              onChange={(e) => setArticlePeriod(e.target.value)}
              style={selectStyle}
            >
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={callArticle}
              disabled={articleStatus.busy}
              style={primaryButton(articleStatus.busy)}
            >
              {articleStatus.busy ? 'Rédaction…' : 'Générer le brouillon'}
            </button>
            {articleStatus.error && <ErrorTag message={articleStatus.error} />}
          </div>
        </div>

        {articleResult?.ok && articleResult.content && (
          <div
            style={{
              marginTop: 'var(--s4)',
              background: 'var(--admin-bg, #fff)',
              border: '1px solid var(--admin-border)',
              borderRadius: 10,
              padding: 'var(--s4)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--admin-text)',
                marginBottom: 4,
              }}
            >
              {articleResult.content.title}
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--admin-text-muted)',
                marginBottom: 10,
              }}
            >
              {articleResult.content.category} · {articleResult.content.excerpt}
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--fb)',
                fontSize: 13,
                color: 'var(--admin-text)',
                lineHeight: 1.6,
                background: 'transparent',
                margin: 0,
              }}
            >
              {articleResult.content.body}
            </pre>
            <p
              style={{
                marginTop: 'var(--s3)',
                fontSize: 11,
                color: 'var(--admin-text-muted)',
                textAlign: 'right',
              }}
            >
              {articleResult.provider} · {articleResult.context_summary.total_docs} docs contexte
            </p>
          </div>
        )}
      </Card>

      {/* P4 — Suggestions éditoriales */}
      <Card
        title="Suggestions éditoriales"
        subtitle="5 à 8 idées d'articles issues de la veille BRVM, classées par priorité."
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={suggPeriod}
            onChange={(e) => setSuggPeriod(e.target.value)}
            style={selectStyle}
          >
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={callSuggestions}
            disabled={suggStatus.busy}
            style={primaryButton(suggStatus.busy)}
          >
            {suggStatus.busy ? 'Analyse…' : 'Proposer des articles'}
          </button>
          {suggStatus.error && <ErrorTag message={suggStatus.error} />}
        </div>

        {suggResult?.ok && suggResult.content && suggResult.content.length > 0 && (
          <div
            style={{
              marginTop: 'var(--s4)',
              display: 'grid',
              gap: 10,
            }}
          >
            {suggResult.content.map((s, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--admin-bg, #fff)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 10,
                  padding: 'var(--s4)',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <PriorityBadge priority={s.priority} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: 'var(--fd)',
                      fontSize: 17,
                      fontWeight: 600,
                      color: 'var(--admin-text)',
                      marginBottom: 4,
                    }}
                  >
                    {s.title}
                  </p>
                  <p
                    style={{ fontSize: 13, color: 'var(--admin-text-muted)', lineHeight: 1.5 }}
                  >
                    {s.angle}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 11,
                      color: 'var(--admin-text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Chip>{s.category}</Chip>
                    <Chip>{s.universe}</Chip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 14,
        padding: 'var(--s5)',
      }}
    >
      <div style={{ marginBottom: 'var(--s4)' }}>
        <h2
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--admin-text)',
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  )
}

function ResultBlock({
  content,
  provider,
  contextLabel,
}: {
  content: string
  provider: string | null
  contextLabel: string
}) {
  return (
    <div
      style={{
        marginTop: 'var(--s4)',
        background: 'var(--admin-bg, #fff)',
        border: '1px solid var(--admin-border)',
        borderRadius: 10,
        padding: 'var(--s4)',
      }}
    >
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--fb)',
          fontSize: 13.5,
          color: 'var(--admin-text)',
          lineHeight: 1.6,
          margin: 0,
          background: 'transparent',
        }}
      >
        {content}
      </pre>
      <p
        style={{
          marginTop: 'var(--s3)',
          fontSize: 11,
          color: 'var(--admin-text-muted)',
          textAlign: 'right',
        }}
      >
        {contextLabel}
        {provider ? ` · ${provider}` : ''}
      </p>
    </div>
  )
}

function ErrorTag({ message }: { message: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        color: '#B23A48',
        fontWeight: 600,
      }}
    >
      {message}
    </span>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        background: 'color-mix(in srgb, var(--admin-text) 6%, transparent)',
        borderRadius: 999,
        fontFamily: 'var(--fm)',
      }}
    >
      {children}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const themes = {
    high: { bg: '#fdf2e3', fg: '#7a4a0c', label: 'Prioritaire' },
    medium: { bg: '#e7f0fa', fg: '#1a4480', label: 'Moyenne' },
    low: { bg: '#e8f3ec', fg: '#1e5631', label: 'Basse' },
  }
  const t = themes[priority]
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 78,
        padding: '4px 10px',
        borderRadius: 8,
        background: t.bg,
        color: t.fg,
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: '.05em',
      }}
    >
      {t.label}
    </span>
  )
}

const primaryButton = (busy: boolean): React.CSSProperties => ({
  padding: '8px 18px',
  borderRadius: 8,
  background: busy ? 'color-mix(in srgb, var(--admin-accent, #C5A028) 50%, transparent)' : 'var(--admin-accent, #C5A028)',
  color: '#0D1628',
  fontWeight: 600,
  fontSize: 13,
  border: 0,
  cursor: busy ? 'wait' : 'pointer',
  opacity: busy ? 0.8 : 1,
})

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  fontSize: 13,
  background: 'var(--admin-bg, #fff)',
  color: 'var(--admin-text)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  fontSize: 13,
  background: 'var(--admin-bg, #fff)',
  color: 'var(--admin-text)',
}
