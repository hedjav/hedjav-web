'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type DataPoint = { month: string; revenue: number }

export function RevenueChart({ data }: { data: DataPoint[] }) {
  return (
    <div style={{ width: '100%', height: 320, minWidth: 400 }}>
      <AreaChart width={800} height={300} data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5A028" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#1B2A4A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#6B82B0', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,.08)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6B82B0', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            background: '#1B2A4A',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 8,
            color: '#E0E6EF',
            fontSize: 12,
          }}
          formatter={(value) => [
            `${Number(value).toLocaleString('fr-FR')} FCFA`,
            'Revenue',
          ]}
          labelStyle={{ color: '#6B82B0' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#C5A028"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </div>
  )
}
