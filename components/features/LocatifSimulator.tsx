'use client'

import { useMemo, useState } from 'react'

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ')
}

export function LocatifSimulator() {
  const [price, setPrice] = useState(20_000_000)
  const [rentMonthly, setRentMonthly] = useState(150_000)
  const [chargesAnnual, setChargesAnnual] = useState(300_000)
  const [occupancy, setOccupancy] = useState(90) // %

  const r = useMemo(() => {
    const annualRent = rentMonthly * 12 * (occupancy / 100)
    const netAnnual = annualRent - chargesAnnual
    const grossYield = price > 0 ? (annualRent / price) * 100 : 0
    const netYield = price > 0 ? (netAnnual / price) * 100 : 0
    return { annualRent, netAnnual, grossYield, netYield }
  }, [price, rentMonthly, chargesAnnual, occupancy])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s4)',
        }}
      >
        <Field label="Prix du bien (FCFA)" value={price} setValue={setPrice} step={500_000} />
        <Field label="Loyer mensuel (FCFA)" value={rentMonthly} setValue={setRentMonthly} step={5_000} />
        <Field label="Charges annuelles (FCFA)" value={chargesAnnual} setValue={setChargesAnnual} step={10_000} />
        <Field label="Taux d'occupation (%)" value={occupancy} setValue={setOccupancy} step={5} min={0} max={100} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--s4)',
        }}
      >
        <Result label="Loyer annuel encaissé" value={`${fmt(r.annualRent)} FCFA`} />
        <Result label="Cash-flow net annuel" value={`${fmt(r.netAnnual)} FCFA`} accent />
        <Result label="Rendement brut" value={`${r.grossYield.toFixed(2)} %`} />
        <Result label="Rendement net" value={`${r.netYield.toFixed(2)} %`} highlight />
      </div>

      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--muted)',
          fontStyle: 'italic',
          padding: 'var(--s4)',
          background: 'var(--n50)',
          borderRadius: 'var(--r8)',
        }}
      >
        💡 En zone UEMOA, un rendement net entre 6 % et 9 % est considéré comme bon.
        En dessous de 5 %, le bien est sur-évalué ou les charges sont trop lourdes.
        Au-dessus de 12 %, vérifiez la qualité du quartier et la stabilité du loyer.
      </p>
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
