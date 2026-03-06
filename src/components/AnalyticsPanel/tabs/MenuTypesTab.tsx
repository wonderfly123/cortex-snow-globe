'use client'

import { useMemo, useState } from 'react'
import { useGlobeStore, type MenuTypeRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { CHART_COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
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
  Cell,
} from 'recharts'

export default function MenuTypesTab() {
  const menuTypesData = useGlobeStore((s) => s.menuTypesData)
  const setMenuTypesData = useGlobeStore((s) => s.setMenuTypesData)

  const { data, loading } = useAnalyticsData<MenuTypeRow>(
    'menu-types',
    menuTypesData,
    setMenuTypesData,
  )

  const countries = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map((r) => r.country))].sort()
  }, [data])

  const years = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map((r) => r.year))].sort((a, b) => a - b)
  }, [data])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const activeCountry = selectedCountry ?? countries[0] ?? null
  const activeYear = selectedYear ?? years[years.length - 1] ?? null

  // Top 3 for selected country + year
  const chartData = useMemo(() => {
    if (!data || !activeCountry || !activeYear) return []
    return data
      .filter((r) => r.country === activeCountry && r.year === activeYear)
      .sort((a, b) => a.typeRank - b.typeRank)
      .slice(0, 3)
  }, [data, activeCountry, activeYear])

  // Summary: which cuisine is #1 most often across all countries (for active year)
  const summaryCards = useMemo(() => {
    if (!data || !activeYear) return null
    const yearData = data.filter(r => r.year === activeYear && r.typeRank <= 3)
    const top3Counts = new Map<string, number>()
    const top1Counts = new Map<string, number>()
    for (const row of yearData) {
      top3Counts.set(row.menuType, (top3Counts.get(row.menuType) ?? 0) + 1)
      if (row.typeRank === 1) {
        top1Counts.set(row.menuType, (top1Counts.get(row.menuType) ?? 0) + 1)
      }
    }
    const sortedTop3 = [...top3Counts.entries()].sort((a, b) => b[1] - a[1])
    const globalNo1 = sortedTop3[0] ?? null
    const mostUniversal = sortedTop3.find(([t]) => t !== globalNo1?.[0]) ?? null
    return {
      globalNo1: globalNo1 ? { name: globalNo1[0], count: globalNo1[1] } : null,
      mostUniversal: mostUniversal ? { name: mostUniversal[0], count: mostUniversal[1] } : null,
    }
  }, [data, activeYear])

  if (loading || data === null) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
        </svg>
        Loading...
      </div>
    )
  }

  const totalCountries = countries.length
  const selectClass = 'bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm'

  return (
    <div className="space-y-4">
      <TabInsight tab="menu-types" />

      {/* Summary Cards */}
      {summaryCards && (
        <div className="flex gap-3">
          {summaryCards.globalNo1 && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Global #1 Cuisine ({activeYear})</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.globalNo1.name}</p>
              <p className="text-[10px] text-slate-400">Top 3 in {summaryCards.globalNo1.count}/{totalCountries} countries</p>
            </div>
          )}
          {summaryCards.mostUniversal && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Most Universal ({activeYear})</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.mostUniversal.name}</p>
              <p className="text-[10px] text-slate-400">Top 3 in {summaryCards.mostUniversal.count}/{totalCountries} countries</p>
            </div>
          )}
        </div>
      )}

      {/* Country + Year Selectors */}
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
        <select
          className={selectClass}
          value={activeYear ?? ''}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Top 3 Bar Chart */}
      {chartData.length > 0 ? (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">
            Top 3 Menu Types — {activeCountry}, {activeYear}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
              <XAxis
                type="number"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="menuType"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Sales']}
                cursor={false}
              />
              <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-sm text-slate-400">No data for this selection.</div>
      )}
    </div>
  )
}
