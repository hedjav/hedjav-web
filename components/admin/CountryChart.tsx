'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type CountryDatum = { country: string; count: number }

const COLORS = [
  '#C5A028', '#4A90D9', '#50C878', '#E07050', '#9B59B6',
  '#E67E22', '#1ABC9C', '#E74C3C',
]

export function CountryChart({ data }: { data: CountryDatum[] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          color: 'var(--admin-text-muted)',
          fontSize: 13,
          padding: '20px 0',
          textAlign: 'center',
        }}
      >
        Aucune donnée pays
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="country"
            cx="50%"
            cy="45%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1B2A4A',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 8,
              color: '#E0E6EF',
              fontSize: 12,
            }}
            formatter={(value, name) => [`${Number(value)} membre${Number(value) > 1 ? 's' : ''}`, String(name)]}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--admin-text-muted)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
