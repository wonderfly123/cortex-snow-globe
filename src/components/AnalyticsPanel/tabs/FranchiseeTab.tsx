'use client'

import { useEffect, useMemo, useState } from 'react'
import { useGlobeStore, type FranchiseeMonthRow } from '@/lib/store'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const MONTH_ABBREV = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function FranchiseeTab() {
  const franchiseeData = useGlobeStore((s) => s.franchiseeData)
  const setFranchiseeData = useGlobeStore((s) => s.setFranchiseeData)

  const analyticsTimeframe = useGlobeStore((s) => s.analyticsTimeframe)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (franchiseeData !== null) return
    setLoading(true)
    const params = analyticsTimeframe !== null ? `?days=${analyticsTimeframe}` : ''
    fetch(`/api/analytics/franchisee-months${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setFranchiseeData(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [franchiseeData, analyticsTimeframe]) // eslint-disable-line react-hooks/exhaustive-deps

  const countries = useMemo(() => {
    if (!franchiseeData) return []
    return [...new Set(franchiseeData.map((r) => r.country))].sort()
  }, [franchiseeData])

  const years = useMemo(() => {
    if (!franchiseeData) return []
    return [...new Set(franchiseeData.map((r) => r.year))].sort((a, b) => a - b)
  }, [franchiseeData])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const activeCountry = selectedCountry ?? countries[0] ?? null

  // Filtered data for selected country (both years)
  const filteredByCountry = useMemo(() => {
    if (!franchiseeData || !activeCountry) return []
    return franchiseeData.filter((r) => r.country === activeCountry)
  }, [franchiseeData, activeCountry])

  // Monthly totals bar chart data — both years side by side
  const monthlyTotals = useMemo(() => {
    const monthMap = new Map<number, Record<number, number>>()
    for (const row of filteredByCountry) {
      const monthNum = parseInt(row.monthLabel.split('-')[1], 10)
      const existing = monthMap.get(monthNum) ?? {}
      existing[row.year] = (existing[row.year] ?? 0) + row.monthlySales
      monthMap.set(monthNum, existing)
    }
    return [...monthMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([monthNum, salesByYear]) => ({
        month: MONTH_ABBREV[monthNum - 1],
        ...Object.fromEntries(years.map(y => [y, salesByYear[y] ?? 0])),
      }))
  }, [filteredByCountry, years])

  // Summary cards — peak month per year
  const peakByYear = useMemo(() => {
    if (monthlyTotals.length === 0 || years.length === 0) return []
    return years.map(y => {
      const key = String(y)
      const best = monthlyTotals.reduce((peak, m) => {
        const val = (m as unknown as Record<string, number>)[key] ?? 0
        const peakVal = (peak as unknown as Record<string, number>)[key] ?? 0
        return val > peakVal ? m : peak
      })
      return { year: y, month: best.month, sales: (best as unknown as Record<string, number>)[key] ?? 0 }
    })
  }, [monthlyTotals, years])

  // Franchisee cards grouped by year
  const franchiseeCardsByYear = useMemo(() => {
    return years.map(year => {
      const yearData = filteredByCountry.filter(r => r.year === year)
      const grouped = new Map<string, FranchiseeMonthRow[]>()
      for (const row of yearData) {
        const existing = grouped.get(row.franchisee)
        if (existing) existing.push(row)
        else grouped.set(row.franchisee, [row])
      }
      const cards = [...grouped.entries()]
        .map(([name, rows]) => ({
          name,
          topMonths: rows
            .sort((a, b) => b.monthlySales - a.monthlySales)
            .slice(0, 3),
          total: rows.reduce((sum, r) => sum + r.monthlySales, 0),
        }))
        .sort((a, b) => b.total - a.total)
      return { year, cards }
    })
  }, [filteredByCountry, years])

  if (loading || !franchiseeData) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
        </svg>
        Loading...
      </div>
    )
  }

  const selectClass =
    'bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50'

  const YEAR_COLORS = [COLORS.primary, COLORS.secondary]

  return (
    <div className="space-y-4">
      <TabInsight tab="franchisees" />

      {/* Summary Cards — Peak month per year */}
      <div className="flex gap-3">
        {peakByYear.map((p, i) => (
          <div key={p.year} className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Peak Month {p.year}</p>
            <p className="text-sm font-semibold" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>{p.month}</p>
            <p className="text-[10px] text-slate-400">{formatCurrency(p.sales)}</p>
          </div>
        ))}
      </div>

      {/* Country Selector */}
      <div className="flex items-center gap-3">
        <select
          className={selectClass}
          value={activeCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Monthly Totals Grouped Bar Chart — both years */}
      {monthlyTotals.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Monthly Revenue — All Franchisees</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyTotals} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [formatCurrency(value ?? 0), String(name)]}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: COLORS.text }}
              />
              {years.map((y, i) => (
                <Bar
                  key={y}
                  dataKey={String(y)}
                  fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Franchisee cards — side by side per year */}
      <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
        {franchiseeCardsByYear.map(({ year, cards }, yi) => (
          <div key={year} className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest font-mono mb-0.5" style={{ color: YEAR_COLORS[yi % YEAR_COLORS.length] }}>
              {year}
            </p>
            {cards.length === 0 ? (
              <p className="text-sm text-slate-400">No data.</p>
            ) : (
              cards.map((card) => (
                <div key={card.name} className="bg-white/5 rounded-xl p-3">
                  <h4 className="text-xs font-semibold mb-1.5 truncate" style={{ color: YEAR_COLORS[yi % YEAR_COLORS.length] }}>
                    {card.name}
                  </h4>
                  <ul className="space-y-0.5">
                    {card.topMonths.map((m, i) => (
                      <li key={m.monthLabel} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          <span className="inline-block w-3 text-center mr-1 font-medium" style={{ color: COLORS.secondary }}>
                            {i + 1}
                          </span>
                          {m.monthLabel}
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(m.monthlySales)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
