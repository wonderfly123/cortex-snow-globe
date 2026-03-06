'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useGlobeStore, type FranchiseeMonthRow } from '@/lib/store'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

interface MonthlyAgg {
  monthNum: number
  monthName: string
  totalSales: number
  totalOrders: number
}

const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function FranchiseeTab() {
  const franchiseeData = useGlobeStore((s) => s.franchiseeData)
  const setFranchiseeData = useGlobeStore((s) => s.setFranchiseeData)

  const [monthlyAgg, setMonthlyAgg] = useState<MonthlyAgg[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (franchiseeData !== null && monthlyAgg !== null) return
    setLoading(true)
    fetch('/api/analytics/franchisee-months')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setFranchiseeData(res.data)
        if (res.monthlyAgg) setMonthlyAgg(res.monthlyAgg)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Extract unique sorted countries and years
  const countries = useMemo(() => {
    if (!franchiseeData) return []
    return [...new Set(franchiseeData.map((r) => r.country))].sort()
  }, [franchiseeData])

  const years = useMemo(() => {
    if (!franchiseeData) return []
    return [...new Set(franchiseeData.map((r) => r.year))].sort((a, b) => a - b)
  }, [franchiseeData])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const activeCountry = selectedCountry ?? countries[0] ?? null
  const activeYear = selectedYear ?? years[0] ?? null

  // Filter data for selected country/year
  const filtered = useMemo(() => {
    if (!franchiseeData || !activeCountry || !activeYear) return []
    return franchiseeData.filter(
      (r) => r.country === activeCountry && r.year === activeYear,
    )
  }, [franchiseeData, activeCountry, activeYear])

  // Group by franchisee, compute totals and monthly breakdown
  const franchiseeStats = useMemo(() => {
    if (filtered.length === 0) return []
    const grouped = new Map<string, FranchiseeMonthRow[]>()
    for (const row of filtered) {
      const existing = grouped.get(row.franchisee)
      if (existing) existing.push(row)
      else grouped.set(row.franchisee, [row])
    }
    return [...grouped.entries()]
      .map(([name, rows]) => {
        const sorted = rows.sort((a, b) => {
          const monthOrder = (label: string) => {
            const idx = MONTH_ABBREV.findIndex((m) => label.startsWith(m))
            return idx >= 0 ? idx : 0
          }
          return monthOrder(a.monthLabel) - monthOrder(b.monthLabel)
        })
        const total = rows.reduce((s, r) => s + r.monthlySales, 0)
        const peakRow = rows.reduce((best, r) =>
          r.monthlySales > best.monthlySales ? r : best,
        )
        return {
          name,
          total,
          peak: peakRow.monthLabel,
          peakSales: peakRow.monthlySales,
          months: sorted.map((r) => r.monthlySales),
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filtered])

  const top15 = franchiseeStats.slice(0, 15)

  // Summary cards from monthlyAgg
  const peakMonth = useMemo(() => {
    if (!monthlyAgg || monthlyAgg.length === 0) return null
    return monthlyAgg.reduce((best, m) =>
      m.totalSales > best.totalSales ? m : best,
    )
  }, [monthlyAgg])

  const slowestMonth = useMemo(() => {
    if (!monthlyAgg || monthlyAgg.length === 0) return null
    return monthlyAgg.reduce((worst, m) =>
      m.totalSales < worst.totalSales ? m : worst,
    )
  }, [monthlyAgg])

  const strongSeason = useMemo(() => {
    if (!monthlyAgg || monthlyAgg.length === 0) return false
    const sorted = [...monthlyAgg].sort((a, b) => b.totalSales - a.totalSales)
    const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2))
    const topMonthNums = new Set(topHalf.map((m) => m.monthNum))
    // May=5, Jun=6, Jul=7, Aug=8
    return [5, 6, 7, 8].every((n) => topMonthNums.has(n))
  }, [monthlyAgg])

  // Heatmap data
  const heatmapMonths = useMemo(() => {
    if (filtered.length === 0) return [] as string[]
    const labels = [...new Set(filtered.map((r) => r.monthLabel))]
    labels.sort((a, b) => {
      const idxA = MONTH_ABBREV.findIndex((m) => a.startsWith(m))
      const idxB = MONTH_ABBREV.findIndex((m) => b.startsWith(m))
      return idxA - idxB
    })
    return labels
  }, [filtered])

  const heatmapData = useMemo(() => {
    if (top15.length === 0 || heatmapMonths.length === 0) return []
    const maxSales = Math.max(
      ...filtered.map((r) => r.monthlySales),
      1,
    )
    return top15.map((f) => {
      const salesByMonth = new Map<string, number>()
      for (const row of filtered.filter((r) => r.franchisee === f.name)) {
        salesByMonth.set(row.monthLabel, row.monthlySales)
      }
      return {
        name: f.name,
        cells: heatmapMonths.map((month) => {
          const sales = salesByMonth.get(month) ?? 0
          const intensity = sales / maxSales
          return { month, sales, intensity }
        }),
      }
    })
  }, [top15, heatmapMonths, filtered])

  if (loading || !franchiseeData) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="32"
            strokeLinecap="round"
          />
        </svg>
        Loading...
      </div>
    )
  }

  const selectClass =
    'bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50'

  return (
    <div className="space-y-4">
      <TabInsight tab="franchisees" />

      {/* Summary Cards */}
      {monthlyAgg && monthlyAgg.length > 0 && (
        <div className="flex gap-3">
          {peakMonth && (
            <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
                Peak Month
              </div>
              <div className="text-sm font-semibold text-cyan-400">
                {MONTH_ABBREV[peakMonth.monthNum - 1]}{' '}
                <span className="text-xs font-normal">
                  {formatCurrency(peakMonth.totalSales)}
                </span>
              </div>
            </div>
          )}
          <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
              Strong Season
            </div>
            <div className="text-sm font-semibold text-cyan-400">
              {strongSeason ? 'Yes — May to Aug' : 'No clear summer peak'}
            </div>
          </div>
          {slowestMonth && (
            <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
                Slowest Month
              </div>
              <div className="text-sm font-semibold text-amber-400">
                {MONTH_ABBREV[slowestMonth.monthNum - 1]}{' '}
                <span className="text-xs font-normal">
                  {formatCurrency(slowestMonth.totalSales)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seasonal Bar Chart */}
      {monthlyAgg && monthlyAgg.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            Seasonal Pattern (All Franchisees)
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={monthlyAgg}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={COLORS.grid}
                vertical={false}
              />
              <XAxis
                dataKey="monthName"
                tick={axisStyle}
              />
              <YAxis
                tick={axisStyle}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
                  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
                  return `$${v}`
                }}
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number | undefined) =>
                  formatCurrency(value ?? 0)
                }
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              />
              <Bar
                dataKey="totalSales"
                fill={COLORS.primary}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Country/Year Dropdowns */}
      <div className="flex items-center gap-3">
        <select
          className={selectClass}
          value={activeCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={activeYear ?? ''}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Top Franchisees Table */}
      {top15.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            Top Franchisees by Revenue
          </h3>
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase font-mono text-slate-500">
                  <th className="text-left py-1 pr-2">#</th>
                  <th className="text-left py-1 pr-2">Franchisee</th>
                  <th className="text-right py-1 pr-2">Total</th>
                  <th className="text-center py-1 pr-2">Trend</th>
                  <th className="text-right py-1">Peak</th>
                </tr>
              </thead>
              <tbody>
                {top15.map((f, i) => {
                  const months = f.months.length
                  const maxVal = Math.max(...f.months, 1)
                  return (
                    <tr
                      key={f.name}
                      className="border-t border-white/5"
                    >
                      <td className="py-1 pr-2 text-slate-500">{i + 1}</td>
                      <td className="py-1 pr-2 text-white truncate max-w-[100px]">
                        {f.name}
                      </td>
                      <td className="py-1 pr-2 text-right text-white font-medium">
                        {formatCurrency(f.total)}
                      </td>
                      <td className="py-1 pr-2 text-center">
                        <svg
                          viewBox={`0 0 ${months * 6} 16`}
                          className="inline-block w-12 h-4"
                        >
                          {f.months.map((val, mi) => {
                            const barH = (val / maxVal) * 14
                            return (
                              <rect
                                key={mi}
                                x={mi * 6}
                                y={16 - barH}
                                width={4}
                                height={barH}
                                fill={COLORS.primary}
                                rx={0.5}
                              />
                            )
                          })}
                        </svg>
                      </td>
                      <td className="py-1 text-right text-slate-400">
                        {f.peak}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Franchisee x Month Heatmap */}
      {heatmapData.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            Revenue Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="text-[8px] font-mono">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-900 z-10 text-left pr-2 py-0.5 text-slate-500">
                    Franchisee
                  </th>
                  {heatmapMonths.map((m) => (
                    <th
                      key={m}
                      className="px-0.5 py-0.5 text-slate-500 font-normal"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.name}>
                    <td className="sticky left-0 bg-slate-900 z-10 pr-2 py-0.5 text-slate-400 truncate max-w-[80px]">
                      {row.name}
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.month} className="px-0.5 py-0.5">
                        <div
                          className="w-6 h-4 rounded-sm"
                          style={{
                            backgroundColor: `rgba(6, 182, 212, ${0.1 + cell.intensity * 0.8})`,
                          }}
                          title={`${row.name} - ${cell.month}: ${formatCurrency(cell.sales)}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
