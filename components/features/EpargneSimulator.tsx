'use client'

import { useMemo, useState } from 'react'

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ')
}

export function EpargneSimulator() {
  const [initial, setInitial] = useState(500_000)
  const [monthly, setMonthly] = useState(50_000)
  const [rate, setRate] = useState(7) // % annuel
  const [years, setYears] = useState(10)

  const data = useMemo(() => {
    const r = rate / 100 / 12
    const n = years * 12
    const points: { month: number; total: number; deposits: number }[] = []
    let total = initial
    let deposits = initial
    for (let m = 0; m <= n; m++) {
      points.push({ month: m, total, deposits })
      total = total * (1 + r) + monthly
      deposits += monthly
    }
    return points
  }, [initial, monthly, rate, years])

  const final = data[data.length - 1]
  const interest = final.total - final.deposits

  const maxValue = Math.max(...data.map((d) => d.total))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s4)',
        }}
      >
        <Field label="Capital initial (FCFA)" value={initial} setValue={setInitial} step={10_000} />
        <Field label="Versement mensuel (FCFA)" value={monthly} setValue={setMonthly} step={5_000} />
        <Field label="Taux annuel (%)" value={rate} setValue={setRate} step={0.5} min={0} max={20} />
        <Field label="Durée (années)" value={years} setValue={setYears} step={1} min={1} max={40} />
      </div>

      {/* Résultats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s4)',
        }}
      >
        <Result label="Capital final" value={`${fmt(final.total)} FCFA`} highlight />
        <Result label="Total versé" value={`${fmt(final.deposits)} FCFA`} />
        <Result label="Intérêts générés" value={`${fmt(interest)} FCFA`} accent />
      </div>

      {/* Graphique simple SVG */}
      <div
        style={{
          background: 'var(--n50)',
          borderRadius: 'var(--r12)',
          padding: 'var(--s5)',
        }}
      >
        <h4 style={{ fontFamily: 'var(--fb)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 'var(--s4)', fontWeight: 600 }}>
          Évolution du capital
        </h4>
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: '100%', height: 200 }}>
          <Path data={data.map((d) => d.deposits)} maxValue={maxValue} color="var(--n400)" />
          <Path data={data.map((d) => d.total)} maxValue={maxValue} color="var(--g500)" />
        </svg>
        <div style={{ display: 'flex', gap: 'var(--s5)', marginTop: 'var(--s3)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
          <Legend color="var(--n400)" label="Versements cumulés" />
          <Legend color="var(--g500)" label="Capital avec intérêts" />
        </div>
      </div>
    </div>
  )
}

function Field({
  label, value, setValue, step = 1, min = 0, max,
}: {
  label: string; value: number; setValue: (n: number) => void; step?: number; min?: number; max?: number
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => setValue(Number(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        style={{ fontFamily: 'var(--fm)' }}
      />
    </label>
  )
}

function Result({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        padding: 'var(--s4) var(--s5)',
        background: highlight ? 'var(--n900)' : 'var(--surface)',
        color: highlight ? '#fff' : accent ? 'var(--g700)' : 'var(--text)',
        border: highlight ? 'none' : '1px solid var(--border)',
        borderRadius: 'var(--r12)',
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.7, marginBottom: 'var(--s2)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fm)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function Path({ data, maxValue, color }: { data: number[]; maxValue: number; color: string }) {
  if (data.length === 0 || maxValue === 0) return null
  const w = 600
  const h = 200
  const stepX = w / (data.length - 1 || 1)
  const points = data.map((v, i) => {
    const x = i * stepX
    const y = h - (v / maxValue) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <polyline
      points={points.join(' ')}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}>
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2 }} />
      {label}
    </span>
  )
}
