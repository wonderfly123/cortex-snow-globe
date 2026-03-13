'use client'

import { useEffect, useMemo } from 'react'
import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import TimeSlider, { useTimeLabels } from './AnalyticsPanel/TimeSlider'

export function GlobalKPIBar() {
  const cities = useGlobeStore((s) => s.cities)
  const salesTrendData = useGlobeStore((s) => s.salesTrendData)
  const setSalesTrendData = useGlobeStore((s) => s.setSalesTrendData)
  const timeRange = useGlobeStore((s) => s.timeRange)
  const analyticsTimeframe = useGlobeStore((s) => s.analyticsTimeframe)

  // Fetch sales trend data on mount if not cached
  useEffect(() => {
    if (salesTrendData !== null) return
    let cancelled = false
    const params = analyticsTimeframe !== null ? `?days=${analyticsTimeframe}` : ''
    fetch(`/api/analytics/sales-trend${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setSalesTrendData(json.data ?? json)
      })
      .catch(console.error)
    return () => { cancelled = true }
  }, [salesTrendData, setSalesTrendData, analyticsTimeframe])

  const labels = useTimeLabels()

  const kpis = useMemo(() => {
    if (salesTrendData) {
      const filteredMonths = new Set(labels.slice(timeRange[0], timeRange[1] + 1))
      const filtered = salesTrendData.filter((r) => filteredMonths.has(r.month))
      const totalRevenue = filtered.reduce((sum, r) => sum + r.totalSales, 0)
      const totalOrders = filtered.reduce((sum, r) => sum + r.totalOrders, 0)
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      return { totalRevenue, totalOrders, avgOrderValue }
    }
    const totalRevenue = cities.reduce((sum, c) => sum + (c.totalSales ?? 0), 0)
    const totalOrders = cities.reduce((sum, c) => sum + (c.totalOrders ?? 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    return { totalRevenue, totalOrders, avgOrderValue }
  }, [cities, salesTrendData, timeRange, labels])

  return (
    <div className="fixed top-6 right-6 z-20 flex flex-col items-end gap-2">
      {/* KPI cards row */}
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl px-5 py-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Total Revenue</span>
          <p className="text-xl font-bold text-cyan-400 mt-0.5">{formatCurrency(kpis.totalRevenue)}</p>
        </div>
        <div className="glass rounded-xl px-5 py-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Orders</span>
          <p className="text-xl font-bold text-white mt-0.5">{formatNumber(kpis.totalOrders)}</p>
        </div>
        <div className="glass rounded-xl px-5 py-2.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Avg Order</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{formatCurrency(kpis.avgOrderValue)}</p>
        </div>
      </div>

      {/* Time slider */}
      <div className="glass rounded-xl px-4 py-2 w-full">
        <TimeSlider />
      </div>
    </div>
  )
}
