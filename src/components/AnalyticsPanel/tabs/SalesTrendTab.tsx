'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useGlobeStore, type SalesTrendRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { MONTH_LABELS } from '../TimeSlider'
import { formatCurrency } from '@/lib/cityData'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TabInsight } from '../TabInsight'

const COUNTRY_COLORS: Record<string, string> = {}
const PALETTE = [
  '#06b6d4','#a78bfa','#f5c842','#f97316','#ef4444',
  '#22d3a0','#60a5fa','#fb923c','#f43f5e','#818cf8',
  '#34d399','#e879f9','#38bdf8','#fbbf24','#d97706',
]

function getColor(country: string, i: number) {
  if (!COUNTRY_COLORS[country]) COUNTRY_COLORS[country] = PALETTE[i % PALETTE.length]
  return COUNTRY_COLORS[country]
}

export default function SalesTrendTab() {
  const salesTrendData = useGlobeStore((s) => s.salesTrendData)
  const setSalesTrendData = useGlobeStore((s) => s.setSalesTrendData)
  const timeRange = useGlobeStore((s) => s.timeRange)

  const { loading } = useAnalyticsData<SalesTrendRow>(
    'sales-trend',
    salesTrendData,
    setSalesTrendData,
  )

  const [visibleCountries, setVisibleCountries] = useState<Set<string> | null>(null)

  const startMonth = MONTH_LABELS[timeRange[0]]
  const endMonth = MONTH_LABELS[timeRange[1]]

  const filtered = useMemo(() => {
    if (!salesTrendData) return []
    return salesTrendData.filter(
      (row) => row.month >= startMonth && row.month <= endMonth,
    )
  }, [salesTrendData, startMonth, endMonth])

  // All countries combined
  const allCountriesData = useMemo(() => {
    const monthMap = new Map<string, { sales: number; orders: number }>()
    for (const row of filtered) {
      const prev = monthMap.get(row.month) ?? { sales: 0, orders: 0 }
      monthMap.set(row.month, {
        sales: prev.sales + row.totalSales,
        orders: prev.orders + row.totalOrders,
      })
    }
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sales, orders }]) => ({
        month,
        sales,
        orders,
        aov: orders > 0 ? Math.round((sales / orders) * 100) / 100 : 0,
      }))
  }, [filtered])

  // All countries sorted by total sales
  const countries = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of filtered) {
      totals.set(row.country, (totals.get(row.country) ?? 0) + row.totalSales)
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
  }, [filtered])

  // Assign colors
  useMemo(() => {
    countries.forEach((c, i) => getColor(c, i))
  }, [countries])

  // Default: all visible
  const activeCountries = visibleCountries ?? new Set(countries)

  const toggleCountry = useCallback((country: string) => {
    setVisibleCountries(prev => {
      const next = new Set(prev ?? countries)
      if (next.has(country)) {
        next.delete(country)
      } else {
        next.add(country)
      }
      return next
    })
  }, [countries])

  const soloCountry = useCallback((country: string) => {
    setVisibleCountries(prev => {
      // If already solo on this country, reset to all
      if (prev && prev.size === 1 && prev.has(country)) {
        return new Set(countries)
      }
      return new Set([country])
    })
  }, [countries])

  // By country pivot
  const byCountryData = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>()
    for (const row of filtered) {
      if (!monthMap.has(row.month)) monthMap.set(row.month, {})
      const entry = monthMap.get(row.month)!
      entry[row.country] = (entry[row.country] ?? 0) + row.totalSales
    }
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }))
  }, [filtered])

  const formatMonth = (m: string | number | React.ReactNode) => {
    if (typeof m !== 'string') return String(m)
    const [y, mo] = m.split('-')
    const abbrev = new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short' })
    return `${abbrev} '${y.slice(2)}`
  }

  if (loading || salesTrendData === null) {
    return <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...</div>
  }

  if (allCountriesData.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No data for the selected time range.</div>
  }

  return (
    <div className="w-full space-y-5">
      <TabInsight tab="sales-trend" />

      {/* Top: All Countries Combined */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">All Countries Combined</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={allCountriesData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="allGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisStyle} tickLine={false} axisLine={false} width={60} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={formatMonth} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Revenue']} />
            <Area type="monotone" dataKey="sales" stroke={COLORS.primary} strokeWidth={2} fill="url(#allGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AOV Trend */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Average Order Value</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={allCountriesData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={axisStyle} tickLine={false} axisLine={false} width={60} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={formatMonth} formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'AOV']} />
            <Line type="monotone" dataKey="aov" stroke="#f5c842" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom: By Country */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-2">By Country</p>

        {/* Clickable legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          {countries.map((country) => {
            const active = activeCountries.has(country)
            return (
              <button
                key={country}
                onClick={() => toggleCountry(country)}
                onDoubleClick={() => soloCountry(country)}
                className={`flex items-center gap-1.5 text-[10px] font-medium transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COUNTRY_COLORS[country] }} />
                {country}
              </button>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={byCountryData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={axisStyle} tickLine={false} axisLine={false} width={60} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={formatMonth}
              formatter={(value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0), name ?? '']}
              itemSorter={(item: { value?: number }) => -(item.value ?? 0)}
            />
            {countries.map((country) => (
              <Line
                key={country}
                type="monotone"
                dataKey={country}
                stroke={COUNTRY_COLORS[country]}
                strokeWidth={activeCountries.has(country) ? 2 : 0}
                dot={false}
                hide={!activeCountries.has(country)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
