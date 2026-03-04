'use client'

import { useMemo } from 'react'
import { MonthlyTrend } from '@/lib/store'

export function Sparkline({ data }: { data: MonthlyTrend[] }) {
  const { path, areaPath } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '' }

    const sorted = [...data].sort((a, b) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
    )
    const sales = sorted.map((d) => d.sales)
    const max = Math.max(...sales)
    const min = Math.min(...sales)
    const range = max - min || 1

    const w = 260, h = 50, pad = 4

    const points = sorted.map((d, i) => ({
      x: pad + (i * (w - 2 * pad)) / (sorted.length - 1 || 1),
      y: h - pad - ((d.sales - min) / range) * (h - 2 * pad),
    }))

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const area = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`

    return { path: linePath, areaPath: area }
  }, [data])

  if (data.length === 0) return null

  return (
    <svg viewBox="0 0 260 50" className="w-full h-12">
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
