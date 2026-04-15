'use client'

import { useState } from 'react'
import { IMPORTANCE_LABELS, type ImportanceLevel } from '@/lib/brvm/ai/types'

type AiScore = {
  importance: ImportanceLevel
  score_100: number
  rationale?: string
}

type Props = {
  documentId: string
  sourceUrl: string
  pdfUrl: string | null
  initialAiScore?: AiScore | null
}

/**
 * Actions inline sur une ligne de document BRVM :
 *   - Source  : ouvre la page source (nouvel onglet)
 *   - PDF     : ouvre le PDF (nouvel onglet, si dispo)
 *   - IA      : scorer + alerter admin (menu popover)
 *
 * Le score IA affiché après clic est aussi persisté en DB via l'API,
 * donc au prochain chargement le badge reviendra automatiquement.
 */
export function DocumentRowActions({
  documentId,
  sourceUrl,
  pdfUrl,
  initialAiScore,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [score, setScore] = useState<AiScore | null>(initialAiScore ?? null)
  const [busy, setBusy] = useState<'score' | 'alert' | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleScore() {
    setBusy('score')
    setFeedback(null)
    try {
      const res = await fetch('/api/brvm/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId }),
      })
      const data = (await res.json()) as {
        ok: boolean
        content?: AiScore | null
        error?: string
        fallback_used?: boolean
      }
      if (data.ok && data.content) {
        setScore(data.content)
        setFeedback(data.fallback_used ? 'Scoré (heuristique)' : 'Scoré (IA)')
      } else {
        setFeedback(data.error ?? 'Erreur scoring')
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(null)
      setMenuOpen(false)
    }
  }

  async function handleAlert() {
    setBusy('alert')
    setFeedback(null)
    try {
      const res = await fetch('/api/brvm/alerts/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: [documentId],
          importance: score?.importance ?? 'important',
        }),
      })
      const data = (await res.json()) as { ok: boolean; sent?: number; note?: string; error?: string }
      if (data.ok) {
        setFeedback(
          data.sent && data.sent > 0
            ? `Alerte envoyée à ${data.sent} admin(s)`
            : data.note ?? 'Alerte déjà envoyée récemment'
        )
      } else {
        setFeedback(data.error ?? 'Erreur')
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(null)
      setMenuOpen(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
      {score && <ImportanceBadge score={score} />}
      <ActionLink href={sourceUrl}>Source</ActionLink>
      {pdfUrl && <ActionLink href={pdfUrl}>PDF</ActionLink>}

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          fontSize: 12,
          color: 'var(--admin-accent, #C5A028)',
          background: 'transparent',
          border: '1px solid color-mix(in srgb, var(--admin-accent, #C5A028) 40%, transparent)',
          padding: '4px 10px',
          borderRadius: 999,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        IA ▾
      </button>

      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 10,
            padding: 4,
            boxShadow: '0 10px 30px rgba(13, 22, 40, 0.12)',
            minWidth: 190,
            zIndex: 20,
          }}
        >
          <MenuButton
            onClick={handleScore}
            busy={busy === 'score'}
            label={score ? 'Re-scorer' : 'Scorer (IA)'}
            sub="Qualifie bruit / utile / important / priority"
          />
          <MenuButton
            onClick={handleAlert}
            busy={busy === 'alert'}
            label="Alerter les admins"
            sub="Envoi email instantané + dédup 12h"
          />
        </div>
      )}

      {feedback && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--admin-text-muted)',
            marginLeft: 6,
            fontStyle: 'italic',
          }}
        >
          {feedback}
        </span>
      )}
    </div>
  )
}

function MenuButton({
  onClick,
  busy,
  label,
  sub,
}: {
  onClick: () => void
  busy: boolean
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        background: 'transparent',
        border: 0,
        borderRadius: 6,
        cursor: busy ? 'wait' : 'pointer',
        color: 'var(--admin-text)',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {busy ? `${label}…` : label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{sub}</div>
    </button>
  )
}

function ImportanceBadge({ score }: { score: AiScore }) {
  const themes: Record<ImportanceLevel, { bg: string; fg: string }> = {
    noise: { bg: '#f1f1f1', fg: '#6b7280' },
    useful: { bg: '#e7f0fa', fg: '#1a4480' },
    important: { bg: '#fdf2e3', fg: '#7a4a0c' },
    priority: { bg: '#fde3e3', fg: '#B23A48' },
  }
  const t = themes[score.importance]
  return (
    <span
      title={score.rationale ?? ''}
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.05em',
        whiteSpace: 'nowrap',
      }}
    >
      {IMPORTANCE_LABELS[score.importance]} · {score.score_100}
    </span>
  )
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontSize: 12,
        color: 'var(--admin-accent, #C5A028)',
        textDecoration: 'none',
        padding: '4px 10px',
        border: '1px solid color-mix(in srgb, var(--admin-accent, #C5A028) 40%, transparent)',
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children} ↗
    </a>
  )
}
