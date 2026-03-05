'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useGlobeStore, type TopBrandRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

export default function TopBrandsTab() {
  const topBrandsData = useGlobeStore((s) => s.topBrandsData)
  const setTopBrandsData = useGlobeStore((s) => s.setTopBrandsData)

  const { data, loading } = useAnalyticsData<TopBrandRow>(
    'top-brands',
    topBrandsData,
    setTopBrandsData,
  )

  const years = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map(r => r.year))).sort()
  }, [data])

  const dataByYear = useMemo(() => {
    if (!data) return {}
    const grouped: Record<number, TopBrandRow[]> = {}
    for (const row of data) {
      if (!grouped[row.year]) grouped[row.year] = []
      grouped[row.year].push(row)
    }
    for (const year of Object.keys(grouped)) {
      grouped[Number(year)].sort((a, b) => a.brandRank - b.brandRank)
    }
    return grouped
  }, [data])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
      </div>
    )
  }

  const barColors = [COLORS.primary, COLORS.secondary, '#a78bfa']

  return (
    <div className="space-y-4">
    <TabInsight tab="top-brands" />
    <div className="flex gap-8">
      {years.map((year, yi) => {
        const yearData = dataByYear[year] ?? []
        return (
          <div key={year} className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Top Brands — {year}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                layout="vertical"
                data={yearData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={axisStyle}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="brand"
                  tick={axisStyle}
                  width={100}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                />
                <Bar
                  dataKey="totalSales"
                  name="Sales"
                  fill={yi === 0 ? COLORS.primary : COLORS.secondary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
    </div>
  )
}
