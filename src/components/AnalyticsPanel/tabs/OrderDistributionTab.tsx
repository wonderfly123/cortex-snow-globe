'use client'

import { useMemo, useState, useCallback } from 'react'
import { useGlobeStore, type OrderDistributionRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'

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

  // Sort by totalSales for donut
  const sortedByRevenue = useMemo(() => {
    if (!orderDistributionData) return []
    return orderDistributionData.slice().sort((a, b) => b.totalSales - a.totalSales)
  }, [orderDistributionData])

  const totalRevenue = useMemo(() => {
    return sortedByRevenue.reduce((sum, row) => sum + row.totalSales, 0)
  }, [sortedByRevenue])

  const chartData: ChartEntry[] = useMemo(() => {
    return sortedByRevenue.map((row, i) => ({
      name: row.country,
      value: row.totalSales,
      percentage: totalRevenue > 0 ? (row.totalSales / totalRevenue) * 100 : 0,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))
  }, [sortedByRevenue, totalRevenue])

  // Summary cards: highest and lowest efficiency
  const highestEfficiency = useMemo(() => {
    if (!orderDistributionData || orderDistributionData.length === 0) return null
    return orderDistributionData.reduce((best, row) =>
      row.revenuePerTruck > best.revenuePerTruck ? row : best
    )
  }, [orderDistributionData])

  const lowestEfficiency = useMemo(() => {
    if (!orderDistributionData || orderDistributionData.length === 0) return null
    return orderDistributionData.reduce((worst, row) =>
      row.revenuePerTruck < worst.revenuePerTruck ? row : worst
    )
  }, [orderDistributionData])

  // Scatter plot data
  const scatterData = useMemo(() => {
    return sortedByRevenue.map((row, i) => ({
      country: row.country,
      truckCount: row.truckCount,
      revenuePerTruck: row.revenuePerTruck,
      totalSales: row.totalSales,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))
  }, [sortedByRevenue])

  // Efficiency bar data sorted by revenuePerTruck descending
  const efficiencyData = useMemo(() => {
    if (!orderDistributionData) return []
    return orderDistributionData
      .slice()
      .sort((a, b) => b.revenuePerTruck - a.revenuePerTruck)
      .map((row, i) => ({
        country: row.country,
        revenuePerTruck: row.revenuePerTruck,
        truckCount: row.truckCount,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
  }, [orderDistributionData])

  // Build donut arcs
  const arcs = useMemo(() => {
    const CX = 90, CY = 90, R_OUT = 85, R_IN = 55, GAP = 1.2
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
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
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

      {/* Summary Cards */}
      <div className="flex gap-4">
        {highestEfficiency && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Highest Efficiency</p>
            <p className="text-sm font-semibold text-cyan-400">{highestEfficiency.country}</p>
            <p className="text-[10px] text-slate-400">
              {formatCurrency(highestEfficiency.revenuePerTruck)}/truck &middot; {formatNumber(highestEfficiency.truckCount)} trucks
            </p>
          </div>
        )}
        {lowestEfficiency && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Lowest Efficiency</p>
            <p className="text-sm font-semibold text-orange-400">{lowestEfficiency.country}</p>
            <p className="text-[10px] text-slate-400">
              {formatCurrency(lowestEfficiency.revenuePerTruck)}/truck &middot; {formatNumber(lowestEfficiency.truckCount)} trucks
            </p>
          </div>
        )}
      </div>

      {/* Donut + Scatter Plot row */}
      <div className="flex items-start gap-6">
        {/* Revenue Donut */}
        <div className="shrink-0">
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Revenue by Country</p>
          <div className="relative" style={{ width: 180, height: 180 }}>
            <svg viewBox="0 0 180 180" className="w-full h-full">
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
                      transformOrigin: '90px 90px',
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
                  className="text-base font-extrabold tracking-tight"
                  style={{ color: centerEntry?.color ?? '#e8f4f8' }}
                >
                  {centerEntry ? formatCurrency(centerEntry.value) : formatCurrency(totalRevenue)}
                </div>
                <div className="text-[8px] uppercase tracking-widest text-slate-500 font-mono mt-0.5">
                  {centerEntry?.name ?? 'Total Revenue'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scatter Plot */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Trucks vs Revenue Per Truck</p>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis
                type="number"
                dataKey="truckCount"
                name="Trucks"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Trucks', position: 'insideBottom', offset: -2, style: { fill: COLORS.text, fontSize: 10 } }}
              />
              <YAxis
                type="number"
                dataKey="revenuePerTruck"
                name="Rev/Truck"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={65}
              />
              <ZAxis
                type="number"
                dataKey="totalSales"
                range={[80, 600]}
                name="Revenue"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                  if (name === 'Rev/Truck') return [formatCurrency(value), 'Rev/Truck']
                  if (name === 'Revenue') return [formatCurrency(value), 'Total Revenue']
                  return [formatNumber(value), name]
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0]?.payload?.country ?? ''
                  }
                  return ''
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Per Truck Horizontal Bar Chart */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Revenue Per Truck Ranking</p>
        <ResponsiveContainer width="100%" height={efficiencyData.length * 32 + 20}>
          <BarChart
            data={efficiencyData}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="country"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => {
                return [
                  `${formatCurrency(value)} (${formatNumber(props.payload.truckCount)} trucks)`,
                  'Rev/Truck',
                ]
              }}
            />
            <Bar dataKey="revenuePerTruck" radius={[0, 4, 4, 0]}>
              {efficiencyData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
