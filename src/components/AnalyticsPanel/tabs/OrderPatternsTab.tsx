'use client'

import React, { useMemo, useEffect } from 'react'
import { useGlobeStore, type OrderPatternRow, type DowPatternRow, type HourPatternRow } from '@/lib/store'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatNumber, formatCurrency } from '@/lib/cityData'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TabInsight } from '../TabInsight'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function OrderPatternsTab() {
  const orderPatternsData = useGlobeStore((s) => s.orderPatternsData)
  const setOrderPatternsData = useGlobeStore((s) => s.setOrderPatternsData)
  const dowPatternsData = useGlobeStore((s) => s.dowPatternsData)
  const setDowPatternsData = useGlobeStore((s) => s.setDowPatternsData)
  const hourPatternsData = useGlobeStore((s) => s.hourPatternsData)
  const setHourPatternsData = useGlobeStore((s) => s.setHourPatternsData)

  // Fetch all pattern data — refetch if any dimension is missing
  useEffect(() => {
    if (dowPatternsData && hourPatternsData && orderPatternsData) return

    fetch('/api/analytics/order-patterns')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setOrderPatternsData(res.data)
        if (res.dowData) setDowPatternsData(res.dowData)
        if (res.hourlyData) setHourPatternsData(res.hourlyData)
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loading = !orderPatternsData || !dowPatternsData || !hourPatternsData

  // Format month label
  const formatMonth = (m: string | number | React.ReactNode) => {
    if (typeof m !== 'string') return String(m)
    const [y, mo] = m.split('-')
    const abbrev = new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short' })
    return `${abbrev} '${y.slice(2)}`
  }

  // Peak day / hour insights
  const peakDay = useMemo(() => {
    if (!dowPatternsData || dowPatternsData.length === 0) return null
    return [...dowPatternsData].sort((a, b) => b.totalOrders - a.totalOrders)[0]
  }, [dowPatternsData])

  const peakHour = useMemo(() => {
    if (!hourPatternsData || hourPatternsData.length === 0) return null
    return [...hourPatternsData].sort((a, b) => b.totalOrders - a.totalOrders)[0]
  }, [hourPatternsData])

  const hourData = useMemo(() => {
    if (!hourPatternsData) return []
    return hourPatternsData.map((r) => ({
      ...r,
      label: r.hour === 0 ? '12am' : r.hour < 12 ? `${r.hour}am` : r.hour === 12 ? '12pm' : `${r.hour - 12}pm`,
    }))
  }, [hourPatternsData])

  const dowData = useMemo(() => {
    if (!dowPatternsData) return []
    return dowPatternsData.map((r) => ({
      ...r,
      label: DOW_LABELS[r.dow] ?? r.dowName,
    }))
  }, [dowPatternsData])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <TabInsight tab="patterns" />

      {/* Insight summary */}
      <div className="flex gap-4">
        {peakDay && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Busiest Day</p>
            <p className="text-sm font-semibold text-cyan-400">{peakDay.dowName}</p>
            <p className="text-[10px] text-slate-400">{formatNumber(peakDay.totalOrders)} orders</p>
          </div>
        )}
        {peakHour && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Peak Hour</p>
            <p className="text-sm font-semibold text-cyan-400">
              {peakHour.hour === 0 ? '12 AM' : peakHour.hour < 12 ? `${peakHour.hour} AM` : peakHour.hour === 12 ? '12 PM' : `${peakHour.hour - 12} PM`}
            </p>
            <p className="text-[10px] text-slate-400">{formatNumber(peakHour.totalOrders)} orders</p>
          </div>
        )}
      </div>

      {/* Three charts side by side */}
      <div className="grid grid-cols-3 gap-6">
        {/* Monthly trend */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-2">Monthly Volume</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={orderPatternsData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={axisStyle} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={formatMonth}
                formatter={(value: number | undefined) => [formatNumber(value ?? 0), 'Orders']}
              />
              <Area type="monotone" dataKey="totalOrders" stroke={COLORS.primary} strokeWidth={2} fill="url(#monthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Day of week */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-2">By Day of Week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={axisStyle} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number | undefined) => [formatNumber(value ?? 0), 'Orders']}
              />
              <Bar dataKey="totalOrders" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hour of day */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-2">By Hour of Day</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval={2} />
              <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={axisStyle} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number | undefined) => [formatNumber(value ?? 0), 'Orders']}
              />
              <Bar dataKey="totalOrders" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
