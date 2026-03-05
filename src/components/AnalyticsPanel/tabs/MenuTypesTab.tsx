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

  // Extract unique countries sorted alphabetically
  const countries = useMemo(() => {
    if (!data) return []
    const unique = [...new Set(data.map((r) => r.country))].sort()
    return unique
  }, [data])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // Default to first country alphabetically
  const activeCountry = selectedCountry ?? countries[0] ?? null

  // Filter data for selected country, sort by typeRank
  const chartData = useMemo(() => {
    if (!data || !activeCountry) return []
    return data
      .filter((r) => r.country === activeCountry)
      .sort((a, b) => a.typeRank - b.typeRank)
      .slice(0, 3)
  }, [data, activeCountry])

  if (loading || data === null) {
    return <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <TabInsight tab="menu-types" />

      {/* Country Selector */}
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

      {/* Horizontal Bar Chart */}
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
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Sales']}
          />
          <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

    </div>
  )
}
