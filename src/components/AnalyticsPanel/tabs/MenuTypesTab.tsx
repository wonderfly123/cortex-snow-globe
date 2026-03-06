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

const EXPECTED_CUISINES: Record<string, string> = {
  Japan: 'Ramen',
  India: 'Indian',
  Germany: 'Hot Dogs',
  Brazil: 'Brazilian',
  'South Korea': 'Korean',
  France: 'Crepes',
  England: 'Fish & Chips',
}

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

  const menuTypes = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map((r) => r.menuType))].sort()
  }, [data])

  // Build lookup: country -> menuType -> row
  const lookup = useMemo(() => {
    if (!data) return new Map<string, Map<string, MenuTypeRow>>()
    const map = new Map<string, Map<string, MenuTypeRow>>()
    for (const row of data) {
      if (!map.has(row.country)) map.set(row.country, new Map())
      map.get(row.country)!.set(row.menuType, row)
    }
    return map
  }, [data])

  // Max revenue across all cells (for heatmap intensity)
  const maxRevenue = useMemo(() => {
    if (!data) return 1
    return Math.max(...data.map((r) => r.totalSales), 1)
  }, [data])

  // Count how many countries each menu type appears in top 3
  const top3Counts = useMemo(() => {
    if (!data) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const row of data) {
      if (row.typeRank <= 3) {
        counts.set(row.menuType, (counts.get(row.menuType) ?? 0) + 1)
      }
    }
    return counts
  }, [data])

  // Summary card values
  const globalNo1 = useMemo(() => {
    if (top3Counts.size === 0) return null
    const sorted = [...top3Counts.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null
  }, [top3Counts])

  const mostUniversal = useMemo(() => {
    if (top3Counts.size === 0) return null
    const sorted = [...top3Counts.entries()].sort((a, b) => b[1] - a[1])
    return sorted[1] ? { name: sorted[1][0], count: sorted[1][1] } : null
  }, [top3Counts])

  // Surprise callouts
  const surprises = useMemo(() => {
    if (!lookup.size) return []
    const results: { country: string; actual: string; expected: string }[] = []
    for (const [country, expected] of Object.entries(EXPECTED_CUISINES)) {
      const countryMap = lookup.get(country)
      if (!countryMap) continue
      // Find #1 ranked menu type
      let topRow: MenuTypeRow | null = null
      for (const row of countryMap.values()) {
        if (row.typeRank === 1) { topRow = row; break }
      }
      if (topRow && topRow.menuType !== expected) {
        results.push({ country, actual: topRow.menuType, expected })
      }
      if (results.length >= 3) break
    }
    return results
  }, [lookup])

  // Country detail bar chart
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const activeCountry = selectedCountry ?? countries[0] ?? null

  const chartData = useMemo(() => {
    if (!data || !activeCountry) return []
    return data
      .filter((r) => r.country === activeCountry)
      .sort((a, b) => a.typeRank - b.typeRank)
      .slice(0, 5)
  }, [data, activeCountry])

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

  return (
    <div className="space-y-4">
      <TabInsight tab="menu-types" />

      {/* Summary Cards */}
      <div className="flex gap-3">
        {globalNo1 && (
          <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
              Global #1 Cuisine
            </div>
            <div className="text-sm font-semibold text-cyan-400">
              {globalNo1.name}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Top 3 in {globalNo1.count}/{totalCountries} countries
            </div>
          </div>
        )}
        {mostUniversal && (
          <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
              Most Universal
            </div>
            <div className="text-sm font-semibold text-cyan-400">
              {mostUniversal.name}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Top 3 in {mostUniversal.count}/{totalCountries} countries
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Matrix */}
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full border-collapse text-[9px] font-mono">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-900/95 z-10 px-2 py-1.5 text-left text-slate-500 font-normal">
                Country
              </th>
              {menuTypes.map((mt) => (
                <th
                  key={mt}
                  className="px-2 py-1.5 text-center text-slate-500 font-normal max-w-[60px] truncate"
                  title={mt}
                >
                  {mt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map((country) => (
              <tr key={country} className="border-t border-white/5">
                <td className="sticky left-0 bg-slate-900/95 z-10 px-2 py-1 text-slate-300 whitespace-nowrap">
                  {country}
                </td>
                {menuTypes.map((mt) => {
                  const row = lookup.get(country)?.get(mt)
                  if (!row || row.totalSales === 0) {
                    return (
                      <td key={mt} className="px-2 py-1 text-center text-slate-600">
                        &mdash;
                      </td>
                    )
                  }
                  const intensity = row.totalSales / maxRevenue
                  const isTop1 = row.typeRank === 1
                  const millions = Math.round(row.totalSales / 1_000_000)
                  return (
                    <td
                      key={mt}
                      className={`px-2 py-1 text-center text-white/90 ${isTop1 ? 'ring-1 ring-cyan-400/50' : ''}`}
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${0.1 + intensity * 0.8})`,
                      }}
                    >
                      ${millions}M
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Surprise Callouts */}
      {surprises.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {surprises.map((s) => (
            <div
              key={s.country}
              className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[10px]"
            >
              <span className="text-amber-400">{s.country}:</span>{' '}
              <span className="text-slate-300">
                #1 is {s.actual}, not {s.expected}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Country Detail Bar Chart */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <select
          value={activeCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm"
        >
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        <ResponsiveContainer width="100%" height={220}>
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
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#ffffff' }}
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
    </div>
  )
}
