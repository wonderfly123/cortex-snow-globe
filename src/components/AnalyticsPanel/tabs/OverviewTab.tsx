'use client'

import { useMemo } from 'react'
import { useGlobeStore, type SalesTrendRow } from '@/lib/store'
import { MONTH_LABELS } from '../TimeSlider'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Globe } from 'lucide-react'

export default function OverviewTab() {
  const salesTrendData = useGlobeStore((s) => s.salesTrendData)
  const setSalesTrendData = useGlobeStore((s) => s.setSalesTrendData)
  const timeRange = useGlobeStore((s) => s.timeRange)

  const { data, loading } = useAnalyticsData<SalesTrendRow>(
    'sales-trend',
    salesTrendData,
    setSalesTrendData,
  )

  // Aggregate monthly sales: sum all countries per month, filtered by timeRange
  const sparklineData = useMemo(() => {
    if (!data) return []

    const filteredMonths = MONTH_LABELS.slice(timeRange[0], timeRange[1] + 1)
    const monthSet = new Set(filteredMonths)

    const monthMap = new Map<string, number>()
    for (const row of data) {
      if (!monthSet.has(row.month)) continue
      monthMap.set(row.month, (monthMap.get(row.month) ?? 0) + row.totalSales)
    }

    return filteredMonths
      .filter((m) => monthMap.has(m))
      .map((month) => ({
        month,
        sales: monthMap.get(month)!,
      }))
  }, [data, timeRange])

  return (
    <div className="space-y-4">
      {/* Global Stats */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Globe className="w-4 h-4 text-cyan-400" />
        <span>
          <span className="text-white font-medium">30</span> cities
          {' \u00B7 '}
          <span className="text-white font-medium">15</span> countries
          {' \u00B7 '}
          <span className="text-white font-medium">2021–2022</span>
        </span>
      </div>

      {/* Sparkline */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Monthly Sales Trend</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : sparklineData.length > 0 ? (
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Sales']}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#sparkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  )
}
