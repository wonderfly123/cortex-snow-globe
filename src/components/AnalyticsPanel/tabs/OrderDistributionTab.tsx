'use client'

import { useMemo, useState, useCallback } from 'react'
import { useGlobeStore, type OrderDistributionRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { formatNumber } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

const SLICE_COLORS = [
  '#00e5ff','#a78bfa','#f5c842','#f97316','#ef4444',
  '#22d3a0','#60a5fa','#fb923c','#f43f5e','#818cf8',
  '#34d399','#e879f9','#38bdf8','#fbbf24','#d97706',
]

interface ChartEntry {
  name: string
  value: number
  percentage: number
  color: string
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function describeArc(cx: number, cy: number, ro: number, ri: number, startDeg: number, endDeg: number) {
  const s1 = polarToXY(cx, cy, ro, startDeg)
  const e1 = polarToXY(cx, cy, ro, endDeg)
  const s2 = polarToXY(cx, cy, ri, endDeg)
  const e2 = polarToXY(cx, cy, ri, startDeg)
  const large = (endDeg - startDeg) > 180 ? 1 : 0
  return `M${s1.x},${s1.y} A${ro},${ro} 0 ${large} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${ri},${ri} 0 ${large} 0 ${e2.x},${e2.y} Z`
}

export default function OrderDistributionTab() {
  const orderDistributionData = useGlobeStore((s) => s.orderDistributionData)
  const setOrderDistributionData = useGlobeStore((s) => s.setOrderDistributionData)

  const { loading } = useAnalyticsData<OrderDistributionRow>(
    'order-distribution',
    orderDistributionData,
    setOrderDistributionData,
  )

  const [hoveredIdx, setHoveredIdx] = useState(-1)
  const [activeIdx, setActiveIdx] = useState(-1)

  const totalOrders = useMemo(() => {
    if (!orderDistributionData) return 0
    return orderDistributionData.reduce((sum, row) => sum + row.totalOrders, 0)
  }, [orderDistributionData])

  const chartData: ChartEntry[] = useMemo(() => {
    if (!orderDistributionData) return []
    return orderDistributionData
      .slice()
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .map((row, i) => ({
        name: row.country,
        value: row.totalOrders,
        percentage: totalOrders > 0 ? (row.totalOrders / totalOrders) * 100 : 0,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
  }, [orderDistributionData, totalOrders])

  const maxOrders = useMemo(() => Math.max(...chartData.map(d => d.value), 1), [chartData])

  // Build donut arcs
  const arcs = useMemo(() => {
    const CX = 130, CY = 130, R_OUT = 115, R_IN = 70, GAP = 1.2
    let cursor = 0
    return chartData.map((entry) => {
      const span = entry.percentage / 100 * 360
      const start = cursor + GAP / 2
      const end = cursor + span - GAP / 2
      cursor += span
      return { d: describeArc(CX, CY, R_OUT, R_IN, start, Math.max(start + 0.1, end)), color: entry.color }
    })
  }, [chartData])

  const handleClick = useCallback((i: number) => {
    setActiveIdx(prev => prev === i ? -1 : i)
  }, [])

  const highlighted = hoveredIdx >= 0 ? hoveredIdx : activeIdx
  const centerEntry = highlighted >= 0 ? chartData[highlighted] : null

  if (loading || orderDistributionData === null) {
    return (
      <div className="flex items-center justify-center h-[200px] text-cyan-300 text-sm">
        Loading order distribution data...
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
        No order distribution data available.
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <TabInsight tab="distribution" />

      <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-3 font-mono">
        Orders by Country — hover or click any segment
      </p>

      <div className="flex items-end gap-8">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 220, height: 220 }}>
          <svg viewBox="0 0 260 260" className="w-full h-full">
            {arcs.map((arc, i) => {
              const dimmed = highlighted >= 0 && highlighted !== i
              return (
                <path
                  key={i}
                  d={arc.d}
                  fill={arc.color}
                  opacity={dimmed ? 0.25 : 0.85}
                  className="cursor-pointer transition-all duration-150"
                  style={{
                    transformOrigin: '130px 130px',
                    transform: highlighted === i ? 'scale(1.04)' : 'scale(1)',
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(-1)}
                  onClick={() => handleClick(i)}
                />
              )
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div
                className="text-xl font-extrabold tracking-tight"
                style={{ color: centerEntry?.color ?? '#e8f4f8' }}
              >
                {centerEntry ? formatNumber(centerEntry.value) : formatNumber(totalOrders)}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mt-0.5">
                {centerEntry?.name ?? 'Total Orders'}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical bar chart */}
        <div className="flex-1 flex items-end gap-1 min-w-0" style={{ height: 220 }}>
          {chartData.map((entry, i) => {
            const isHovered = hoveredIdx === i
            const isActive = activeIdx === i
            const lit = isHovered || isActive
            const barHeight = (entry.value / maxOrders) * 180
            return (
              <div
                key={entry.name}
                className="flex-1 flex flex-col items-center justify-end cursor-pointer group"
                style={{ height: '100%' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(-1)}
                onClick={() => handleClick(i)}
              >
                {/* Value label on hover */}
                <div className={`text-[9px] font-mono mb-1 transition-opacity ${lit ? 'opacity-100 text-slate-300' : 'opacity-0'}`}>
                  {formatNumber(entry.value)}
                </div>
                {/* Bar */}
                <div
                  className="w-full rounded-t transition-all duration-200"
                  style={{
                    height: barHeight,
                    backgroundColor: entry.color,
                    opacity: highlighted >= 0 && !lit ? 0.25 : 0.85,
                    transform: lit ? 'scaleX(1.1)' : 'scaleX(1)',
                    maxWidth: 48,
                    minWidth: 8,
                  }}
                />
                {/* Country label */}
                <div className={`text-[8px] font-mono mt-1.5 truncate w-full text-center transition-colors ${lit ? 'text-slate-200' : 'text-slate-500'}`}>
                  {entry.name.length > 6 ? entry.name.slice(0, 5) + '…' : entry.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
