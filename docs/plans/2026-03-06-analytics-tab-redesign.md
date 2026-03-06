# Analytics Tab Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign 4 analytics tabs (Top Brands, Menu Types, Distribution, Franchisees) with summary cards, multiple chart types, and complete data to tell the business.md stories clearly.

**Architecture:** Each tab gets the Patterns tab treatment: summary stat cards at top, primary chart, secondary chart(s). API routes are expanded to return richer data. Store types updated to match. All charts use Recharts (already installed).

**Tech Stack:** Next.js 14, React, Recharts, Zustand, Tailwind CSS, Snowflake SQL

---

### Task 1: Distribution Tab — API + Store Updates

**Files:**
- Modify: `src/app/api/analytics/order-distribution/route.ts`
- Modify: `src/lib/store.ts:67-71`

**Step 1: Update the API route to include truck count and revenue-per-truck**

```typescript
// src/app/api/analytics/order-distribution/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface OrderDistributionRow {
  COUNTRY: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
  TRUCK_COUNT: number
}

export async function GET() {
  try {
    const rows = await executeQuery<OrderDistributionRow>(`
      SELECT COUNTRY,
        SUM(TOTAL_ORDERS) AS TOTAL_ORDERS,
        SUM(TOTAL_SALES) AS TOTAL_SALES,
        SUM(ACTIVE_TRUCKS) AS TRUCK_COUNT
      FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
      GROUP BY COUNTRY ORDER BY TOTAL_SALES DESC
    `)
    const data = rows.map(row => ({
      country: row.COUNTRY,
      totalOrders: row.TOTAL_ORDERS,
      totalSales: row.TOTAL_SALES,
      truckCount: row.TRUCK_COUNT,
      revenuePerTruck: row.TRUCK_COUNT > 0
        ? Math.round(row.TOTAL_SALES / row.TRUCK_COUNT)
        : 0,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch order distribution:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
```

**Step 2: Update the store type**

In `src/lib/store.ts`, change `OrderDistributionRow`:

```typescript
export interface OrderDistributionRow {
  country: string
  totalOrders: number
  totalSales: number
  truckCount: number
  revenuePerTruck: number
}
```

**Step 3: Verify the dev server compiles without errors**

Run: `cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build 2>&1 | head -30`
Expected: Compilation succeeds (the existing Distribution tab component still references `totalOrders` and `totalSales` which still exist)

**Step 4: Commit**

```bash
git add src/app/api/analytics/order-distribution/route.ts src/lib/store.ts
git commit -m "feat(distribution): add truck count and revenue-per-truck to API and store"
```

---

### Task 2: Distribution Tab — Redesign Component

**Files:**
- Modify: `src/components/AnalyticsPanel/tabs/OrderDistributionTab.tsx` (full rewrite)

**Step 1: Rewrite OrderDistributionTab with summary cards, revenue donut, scatter plot, and efficiency bar chart**

```tsx
'use client'

import { useMemo, useState, useCallback } from 'react'
import { useGlobeStore, type OrderDistributionRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  LabelList,
} from 'recharts'

const SLICE_COLORS = [
  '#00e5ff','#a78bfa','#f5c842','#f97316','#ef4444',
  '#22d3a0','#60a5fa','#fb923c','#f43f5e','#818cf8',
  '#34d399','#e879f9','#38bdf8','#fbbf24','#d97706',
]

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function describeArc(cx: number, cy: number, ro: number, ri: number, startDeg: number, endDeg: number) {
  const s1 = polarToXY(cx, cy, ro, startDeg)
  const e1 = polarToXY(cx, cy, ro, endDeg)
  const s2 = polarToXY(cx, cy, ri, endDeg)
  const e2 = polarToXY(cx, cy, ri, startDeg)
  const large = (endDeg - startDeg) > 180 ? 1 : 0
  return `M${s1.x},${s1.y} A${ro},${ro} 0 ${large} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${ri},${ri} 0 ${large} 0 ${e2.x},${e2.y} Z`
}

export default function OrderDistributionTab() {
  const orderDistributionData = useGlobeStore((s) => s.orderDistributionData)
  const setOrderDistributionData = useGlobeStore((s) => s.setOrderDistributionData)

  const { loading } = useAnalyticsData<OrderDistributionRow>(
    'order-distribution',
    orderDistributionData,
    setOrderDistributionData,
  )

  const [hoveredIdx, setHoveredIdx] = useState(-1)
  const [activeIdx, setActiveIdx] = useState(-1)

  const totalRevenue = useMemo(() => {
    if (!orderDistributionData) return 0
    return orderDistributionData.reduce((sum, row) => sum + row.totalSales, 0)
  }, [orderDistributionData])

  // Sorted by revenue for donut
  const chartData = useMemo(() => {
    if (!orderDistributionData) return []
    return orderDistributionData
      .slice()
      .sort((a, b) => b.totalSales - a.totalSales)
      .map((row, i) => ({
        ...row,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
        percentage: totalRevenue > 0 ? (row.totalSales / totalRevenue) * 100 : 0,
      }))
  }, [orderDistributionData, totalRevenue])

  // Summary card data
  const mostEfficient = useMemo(() => {
    if (!chartData.length) return null
    return [...chartData].sort((a, b) => b.revenuePerTruck - a.revenuePerTruck)[0]
  }, [chartData])

  const leastEfficient = useMemo(() => {
    if (!chartData.length) return null
    return [...chartData].sort((a, b) => a.revenuePerTruck - b.revenuePerTruck)[0]
  }, [chartData])

  // Efficiency bar data (sorted by revenuePerTruck desc)
  const efficiencyData = useMemo(() => {
    return [...chartData].sort((a, b) => b.revenuePerTruck - a.revenuePerTruck)
  }, [chartData])

  // Scatter data
  const scatterData = useMemo(() => {
    return chartData.map(d => ({
      country: d.country,
      trucks: d.truckCount,
      rpt: d.revenuePerTruck,
      revenue: d.totalSales,
      color: d.color,
    }))
  }, [chartData])

  // Donut arcs
  const arcs = useMemo(() => {
    const CX = 110, CY = 110, R_OUT = 100, R_IN = 62, GAP = 1.2
    let cursor = 0
    return chartData.map((entry) => {
      const span = entry.percentage / 100 * 360
      const start = cursor + GAP / 2
      const end = cursor + span - GAP / 2
      cursor += span
      return { d: describeArc(CX, CY, R_OUT, R_IN, start, Math.max(start + 0.1, end)), color: entry.color }
    })
  }, [chartData])

  const handleClick = useCallback((i: number) => {
    setActiveIdx(prev => prev === i ? -1 : i)
  }, [])

  const highlighted = hoveredIdx >= 0 ? hoveredIdx : activeIdx
  const centerEntry = highlighted >= 0 ? chartData[highlighted] : null

  if (loading || orderDistributionData === null) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
      </div>
    )
  }

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No data available.</div>
  }

  return (
    <div className="w-full space-y-5">
      <TabInsight tab="distribution" />

      {/* Summary Cards */}
      <div className="flex gap-4">
        {mostEfficient && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Highest Efficiency</p>
            <p className="text-sm font-semibold text-cyan-400">{mostEfficient.country}</p>
            <p className="text-[10px] text-slate-400">{formatCurrency(mostEfficient.revenuePerTruck)}/truck ({mostEfficient.truckCount} trucks)</p>
          </div>
        )}
        {leastEfficient && (
          <div className="bg-white/5 rounded-lg px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Lowest Efficiency</p>
            <p className="text-sm font-semibold text-amber-400">{leastEfficient.country}</p>
            <p className="text-[10px] text-slate-400">{formatCurrency(leastEfficient.revenuePerTruck)}/truck ({leastEfficient.truckCount} trucks)</p>
          </div>
        )}
      </div>

      {/* Revenue Donut + Scatter Plot */}
      <div className="flex items-start gap-6">
        {/* Donut */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Revenue by Country</p>
          <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
            <svg viewBox="0 0 220 220" className="w-full h-full">
              {arcs.map((arc, i) => {
                const dimmed = highlighted >= 0 && highlighted !== i
                return (
                  <path
                    key={i}
                    d={arc.d}
                    fill={arc.color}
                    opacity={dimmed ? 0.25 : 0.85}
                    className="cursor-pointer transition-all duration-150"
                    style={{
                      transformOrigin: '110px 110px',
                      transform: highlighted === i ? 'scale(1.04)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(-1)}
                    onClick={() => handleClick(i)}
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-lg font-extrabold tracking-tight" style={{ color: centerEntry?.color ?? '#e8f4f8' }}>
                  {centerEntry ? formatCurrency(centerEntry.totalSales) : formatCurrency(totalRevenue)}
                </div>
                <div className="text-[8px] uppercase tracking-widest text-slate-500 font-mono mt-0.5">
                  {centerEntry?.country ?? 'Total Revenue'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scatter Plot: Trucks vs Efficiency */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Trucks vs Revenue/Truck</p>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis
                type="number"
                dataKey="trucks"
                name="Trucks"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Trucks', position: 'insideBottom', offset: -2, style: { fill: COLORS.text, fontSize: 10 } }}
              />
              <YAxis
                type="number"
                dataKey="rpt"
                name="Rev/Truck"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
                width={50}
              />
              <ZAxis type="number" dataKey="revenue" range={[80, 400]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'Rev/Truck') return [formatCurrency(value), 'Rev/Truck']
                  if (name === 'Trucks') return [value, 'Trucks']
                  return [formatCurrency(value), name]
                }}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload
                  return item?.country ?? ''
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
                <LabelList dataKey="country" position="top" style={{ fill: COLORS.text, fontSize: 9 }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Per Truck — Horizontal Bars */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Revenue Per Truck (Efficiency Ranking)</p>
        <ResponsiveContainer width="100%" height={Math.max(efficiencyData.length * 28, 120)}>
          <BarChart
            data={efficiencyData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`}
            />
            <YAxis
              type="category"
              dataKey="country"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [formatCurrency(value), 'Rev/Truck']}
              labelFormatter={(label: string) => {
                const item = efficiencyData.find(d => d.country === label)
                return `${label} (${item?.truckCount ?? '?'} trucks)`
              }}
            />
            <Bar dataKey="revenuePerTruck" radius={[0, 4, 4, 0]}>
              {efficiencyData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

**Step 2: Verify the dev server compiles and the tab renders**

Run: `cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build 2>&1 | head -30`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/AnalyticsPanel/tabs/OrderDistributionTab.tsx
git commit -m "feat(distribution): redesign with summary cards, scatter plot, and efficiency bars"
```

---

### Task 3: Top Brands Tab — API + Store Updates

**Files:**
- Modify: `src/app/api/analytics/top-brands/route.ts`
- Modify: `src/lib/store.ts:43-49`

**Step 1: Update the API to support optional country filter and return more brands**

```typescript
// src/app/api/analytics/top-brands/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface TopBrandsRow {
  YEAR: number
  TRUCK_BRAND_NAME: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
  BRAND_RANK: number
  COUNTRY: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')

    let query: string
    if (country) {
      query = `
        SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME, COUNTRY,
          SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
          RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE COUNTRY = ?
        GROUP BY 1, 2, 3 QUALIFY BRAND_RANK <= 5 ORDER BY YEAR, BRAND_RANK
      `
    } else {
      query = `
        SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME, NULL AS COUNTRY,
          SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
          RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        GROUP BY 1, 2 QUALIFY BRAND_RANK <= 5 ORDER BY YEAR, BRAND_RANK
      `
    }

    const rows = await executeQuery<TopBrandsRow>(query, country ? [country] : undefined)
    const data = rows.map(row => ({
      year: row.YEAR,
      brand: row.TRUCK_BRAND_NAME,
      totalSales: row.TOTAL_SALES,
      totalOrders: row.TOTAL_ORDERS,
      brandRank: row.BRAND_RANK,
      country: row.COUNTRY,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch top brands:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
```

**Step 2: Update store type to include optional country**

In `src/lib/store.ts`, update `TopBrandRow`:

```typescript
export interface TopBrandRow {
  year: number
  brand: string
  totalSales: number
  totalOrders: number
  brandRank: number
  country?: string | null
}
```

**Step 3: Commit**

```bash
git add src/app/api/analytics/top-brands/route.ts src/lib/store.ts
git commit -m "feat(top-brands): add country filter and return top 5 brands"
```

---

### Task 4: Top Brands Tab — Redesign Component

**Files:**
- Modify: `src/components/AnalyticsPanel/tabs/TopBrandsTab.tsx` (full rewrite)

**Step 1: Rewrite TopBrandsTab with summary cards, grouped bars, slope chart, and country dropdown**

```tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { useGlobeStore, type TopBrandRow } from '@/lib/store'
import { COLORS, tooltipStyle, axisStyle, CHART_COLORS } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

const BRAND_COLORS: Record<string, string> = {}
const PALETTE = ['#06b6d4','#a78bfa','#f5c842','#f97316','#22d3a0','#60a5fa','#fb923c','#ef4444','#818cf8','#34d399']

function getBrandColor(brand: string, i: number) {
  if (!BRAND_COLORS[brand]) BRAND_COLORS[brand] = PALETTE[i % PALETTE.length]
  return BRAND_COLORS[brand]
}

// Available countries (hardcoded from dataset — avoids extra API call)
const COUNTRIES = [
  'All Countries','Australia','Brazil','Canada','Egypt','England','France',
  'Germany','India','Japan','Poland','South Africa','South Korea','Spain',
  'Sweden','United States',
]

export default function TopBrandsTab() {
  const topBrandsData = useGlobeStore((s) => s.topBrandsData)
  const setTopBrandsData = useGlobeStore((s) => s.setTopBrandsData)

  const [selectedCountry, setSelectedCountry] = useState('All Countries')
  const [countryData, setCountryData] = useState<TopBrandRow[] | null>(null)
  const [countryLoading, setCountryLoading] = useState(false)

  // Fetch overall data via the standard hook
  const { loading } = {
    loading: topBrandsData === null,
  }

  // Initial fetch (overall)
  useEffect(() => {
    if (topBrandsData !== null) return
    fetch('/api/analytics/top-brands')
      .then(r => r.json())
      .then(res => setTopBrandsData(res.data))
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch country-specific data when country changes
  useEffect(() => {
    if (selectedCountry === 'All Countries') {
      setCountryData(null)
      return
    }
    setCountryLoading(true)
    fetch(`/api/analytics/top-brands?country=${encodeURIComponent(selectedCountry)}`)
      .then(r => r.json())
      .then(res => setCountryData(res.data))
      .catch(console.error)
      .finally(() => setCountryLoading(false))
  }, [selectedCountry])

  const data = selectedCountry === 'All Countries' ? topBrandsData : countryData
  const isLoading = selectedCountry === 'All Countries' ? loading : countryLoading

  const years = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map(r => r.year))).sort()
  }, [data])

  // Assign colors to brands
  const allBrands = useMemo(() => {
    if (!data) return []
    const unique = [...new Set(data.map(r => r.brand))]
    unique.forEach((b, i) => getBrandColor(b, i))
    return unique
  }, [data])

  // Grouped bar data: each entry = { brand, 2021: sales, 2022: sales }
  const groupedData = useMemo(() => {
    if (!data || years.length === 0) return []
    const brandMap = new Map<string, Record<string, number>>()
    for (const row of data) {
      if (!brandMap.has(row.brand)) brandMap.set(row.brand, {})
      brandMap.get(row.brand)![String(row.year)] = row.totalSales
    }
    return [...brandMap.entries()]
      .map(([brand, yearSales]) => ({ brand, ...yearSales }))
      .sort((a, b) => {
        const lastYear = String(years[years.length - 1])
        return ((b[lastYear] as number) ?? 0) - ((a[lastYear] as number) ?? 0)
      })
  }, [data, years])

  // Summary cards
  const summaryCards = useMemo(() => {
    if (!data || years.length < 2) return null
    const y1 = years[0], y2 = years[1]
    const d1 = data.filter(r => r.year === y1)
    const d2 = data.filter(r => r.year === y2)

    // Fastest riser: biggest absolute revenue increase
    let fastestRiser: { brand: string; growth: number; pct: number } | null = null
    for (const b2 of d2) {
      const b1 = d1.find(r => r.brand === b2.brand)
      const prev = b1?.totalSales ?? 0
      const growth = b2.totalSales - prev
      const pct = prev > 0 ? (growth / prev) * 100 : 0
      if (!fastestRiser || growth > fastestRiser.growth) {
        fastestRiser = { brand: b2.brand, growth, pct }
      }
    }

    // Most consistent: in top ranks both years
    const consistent = d2.find(b2 => d1.some(b1 => b1.brand === b2.brand))

    return { fastestRiser, consistent }
  }, [data, years])

  // Slope chart data: rank in year1 -> rank in year2
  const slopeData = useMemo(() => {
    if (!data || years.length < 2) return []
    const y1 = years[0], y2 = years[1]
    const d1 = data.filter(r => r.year === y1)
    const d2 = data.filter(r => r.year === y2)
    const brands = new Set([...d1.map(r => r.brand), ...d2.map(r => r.brand)])
    return [...brands].map(brand => ({
      brand,
      rank1: d1.find(r => r.brand === brand)?.brandRank ?? null,
      rank2: d2.find(r => r.brand === brand)?.brandRank ?? null,
      color: BRAND_COLORS[brand] ?? PALETTE[0],
    }))
  }, [data, years])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <TabInsight tab="top-brands" />

      {/* Country Selector */}
      <select
        value={selectedCountry}
        onChange={(e) => setSelectedCountry(e.target.value)}
        className="bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm"
      >
        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Summary Cards */}
      {summaryCards && (
        <div className="flex gap-4">
          {summaryCards.fastestRiser && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Fastest Riser</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.fastestRiser.brand}</p>
              <p className="text-[10px] text-slate-400">+{summaryCards.fastestRiser.pct.toFixed(0)}% YoY</p>
            </div>
          )}
          {summaryCards.consistent && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Most Consistent</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.consistent.brand}</p>
              <p className="text-[10px] text-slate-400">Top {summaryCards.consistent.brandRank} both years</p>
            </div>
          )}
        </div>
      )}

      {/* Grouped Bar Chart — YoY comparison */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Revenue by Brand ({years.join(' vs ')})</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={groupedData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
            <YAxis type="category" dataKey="brand" tick={axisStyle} tickLine={false} axisLine={false} width={120} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
            {years.map((year, i) => (
              <Bar key={year} dataKey={String(year)} name={String(year)} fill={i === 0 ? COLORS.primary : COLORS.secondary} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Slope/Bump Chart — Rank Change */}
      {slopeData.length > 0 && years.length >= 2 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Rank Change ({years[0]} → {years[1]})</p>
          <div className="relative" style={{ height: 160 }}>
            <svg viewBox="0 0 400 140" className="w-full h-full">
              {/* Year labels */}
              <text x="60" y="15" fill={COLORS.text} fontSize="11" textAnchor="middle">{years[0]}</text>
              <text x="340" y="15" fill={COLORS.text} fontSize="11" textAnchor="middle">{years[1]}</text>

              {slopeData.map((item) => {
                if (item.rank1 === null || item.rank2 === null) return null
                const y1 = 25 + (item.rank1 - 1) * 24
                const y2 = 25 + (item.rank2 - 1) * 24
                return (
                  <g key={item.brand}>
                    <line x1="80" y1={y1} x2="320" y2={y2} stroke={item.color} strokeWidth="2" strokeOpacity="0.7" />
                    <circle cx="80" cy={y1} r="4" fill={item.color} />
                    <circle cx="320" cy={y2} r="4" fill={item.color} />
                    <text x="30" y={y1 + 4} fill={COLORS.text} fontSize="9" textAnchor="end">#{item.rank1}</text>
                    <text x="370" y={y2 + 4} fill={COLORS.text} fontSize="9" textAnchor="start">#{item.rank2}</text>
                    {/* Brand label on left */}
                    <text x="74" y={y1 - 8} fill={item.color} fontSize="8" textAnchor="end">{item.brand.length > 18 ? item.brand.slice(0, 16) + '…' : item.brand}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build 2>&1 | head -30`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/AnalyticsPanel/tabs/TopBrandsTab.tsx
git commit -m "feat(top-brands): redesign with grouped bars, slope chart, summary cards, country filter"
```

---

### Task 5: Menu Types Tab — API Update

**Files:**
- Modify: `src/app/api/analytics/menu-types/route.ts`

**Step 1: Update the API to return ALL country x menu type combinations (remove top-3 filter)**

```typescript
// src/app/api/analytics/menu-types/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface MenuTypesRow {
  COUNTRY: string
  MENU_TYPE: string
  TOTAL_SALES: number
  TYPE_RANK: number
}

export async function GET() {
  try {
    const rows = await executeQuery<MenuTypesRow>(`
      SELECT COUNTRY, MENU_TYPE, SUM(PRICE) AS TOTAL_SALES,
        RANK() OVER (PARTITION BY COUNTRY ORDER BY SUM(PRICE) DESC) AS TYPE_RANK
      FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
      GROUP BY 1, 2 ORDER BY COUNTRY, TYPE_RANK
    `)
    const data = rows.map(row => ({
      country: row.COUNTRY,
      menuType: row.MENU_TYPE,
      totalSales: row.TOTAL_SALES,
      typeRank: row.TYPE_RANK,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch menu types:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/analytics/menu-types/route.ts
git commit -m "feat(menu-types): return all menu types per country for heatmap"
```

---

### Task 6: Menu Types Tab — Redesign Component

**Files:**
- Modify: `src/components/AnalyticsPanel/tabs/MenuTypesTab.tsx` (full rewrite)

**Step 1: Rewrite MenuTypesTab with summary cards, heatmap matrix, surprise callouts, and country bar chart**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useGlobeStore, type MenuTypeRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
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
  Cell,
} from 'recharts'

const CHART_COLORS = ['#06b6d4', '#22d3ee', '#67e8f9', '#f59e0b', '#a78bfa']

// Known "local" cuisines for surprise detection
const LOCAL_CUISINE: Record<string, string> = {
  'Japan': 'Ramen',
  'India': 'Indian',
  'Germany': 'Hot Dogs',
  'Brazil': 'Brazilian',
  'South Korea': 'Korean',
  'Spain': 'Tacos',
  'France': 'Crepes',
  'England': 'Fish & Chips',
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

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const activeCountry = selectedCountry ?? countries[0] ?? null

  // Heatmap data: { country -> { menuType -> totalSales } }
  const heatmapData = useMemo(() => {
    if (!data) return new Map<string, Map<string, number>>()
    const map = new Map<string, Map<string, number>>()
    for (const row of data) {
      if (!map.has(row.country)) map.set(row.country, new Map())
      map.get(row.country)!.set(row.menuType, row.totalSales)
    }
    return map
  }, [data])

  // Max sales for color scale
  const maxSales = useMemo(() => {
    if (!data) return 1
    return Math.max(...data.map(r => r.totalSales), 1)
  }, [data])

  // Summary cards
  const summaryCards = useMemo(() => {
    if (!data || countries.length === 0) return null

    // Count how many countries each menu type appears in top 3
    const top3Counts = new Map<string, number>()
    const top1Counts = new Map<string, number>()
    for (const country of countries) {
      const countryData = data.filter(r => r.country === country).sort((a, b) => a.typeRank - b.typeRank)
      const top3 = countryData.slice(0, 3)
      for (const row of top3) {
        top3Counts.set(row.menuType, (top3Counts.get(row.menuType) ?? 0) + 1)
      }
      if (countryData.length > 0 && countryData[0].typeRank === 1) {
        top1Counts.set(countryData[0].menuType, (top1Counts.get(countryData[0].menuType) ?? 0) + 1)
      }
    }

    const globalWinner = [...top3Counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const mostUniversal = [...top3Counts.entries()].sort((a, b) => b[1] - a[1])
    // Second most universal (if different from winner)
    const universal = mostUniversal.find(([type]) => type !== globalWinner?.[0]) ?? mostUniversal[0]

    return {
      globalWinner: globalWinner ? { type: globalWinner[0], count: globalWinner[1], total: countries.length } : null,
      mostUniversal: universal ? { type: universal[0], count: universal[1], total: countries.length } : null,
    }
  }, [data, countries])

  // Surprise callouts: countries where #1 is NOT the local cuisine
  const surprises = useMemo(() => {
    if (!data) return []
    const results: { country: string; expected: string; actual: string }[] = []
    for (const country of countries) {
      const localCuisine = LOCAL_CUISINE[country]
      if (!localCuisine) continue
      const top1 = data.filter(r => r.country === country).sort((a, b) => a.typeRank - b.typeRank)[0]
      if (top1 && top1.menuType !== localCuisine) {
        results.push({ country, expected: localCuisine, actual: top1.menuType })
      }
    }
    return results.slice(0, 3)
  }, [data, countries])

  // Bar chart data for selected country
  const countryBarData = useMemo(() => {
    if (!data || !activeCountry) return []
    return data
      .filter(r => r.country === activeCountry)
      .sort((a, b) => a.typeRank - b.typeRank)
      .slice(0, 5)
  }, [data, activeCountry])

  if (loading || data === null) {
    return <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...</div>
  }

  return (
    <div className="space-y-5">
      <TabInsight tab="menu-types" />

      {/* Summary Cards */}
      {summaryCards && (
        <div className="flex gap-4">
          {summaryCards.globalWinner && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Global #1 Cuisine</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.globalWinner.type}</p>
              <p className="text-[10px] text-slate-400">Top 3 in {summaryCards.globalWinner.count}/{summaryCards.globalWinner.total} countries</p>
            </div>
          )}
          {summaryCards.mostUniversal && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Most Universal</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.mostUniversal.type}</p>
              <p className="text-[10px] text-slate-400">Top 3 in {summaryCards.mostUniversal.count}/{summaryCards.mostUniversal.total} countries</p>
            </div>
          )}
        </div>
      )}

      {/* Heatmap Matrix */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-2">Revenue Heatmap (Country x Cuisine)</p>
        <div className="overflow-x-auto">
          <table className="text-[9px] font-mono border-collapse">
            <thead>
              <tr>
                <th className="text-left text-slate-500 pr-2 pb-1 sticky left-0 bg-slate-900/95">Country</th>
                {menuTypes.map(mt => (
                  <th key={mt} className="text-center text-slate-500 px-1 pb-1 min-w-[52px]">
                    <span className="block truncate max-w-[52px]" title={mt}>{mt.length > 7 ? mt.slice(0, 6) + '…' : mt}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countries.map(country => {
                const countryMap = heatmapData.get(country)
                return (
                  <tr key={country}>
                    <td className="text-slate-400 pr-2 py-0.5 whitespace-nowrap sticky left-0 bg-slate-900/95">{country}</td>
                    {menuTypes.map(mt => {
                      const sales = countryMap?.get(mt) ?? 0
                      const intensity = sales / maxSales
                      const isTop1 = data?.find(r => r.country === country && r.menuType === mt && r.typeRank === 1)
                      return (
                        <td key={mt} className="px-0.5 py-0.5">
                          <div
                            className={`rounded-sm text-center py-1 px-0.5 ${isTop1 ? 'ring-1 ring-cyan-400/50' : ''}`}
                            style={{
                              backgroundColor: sales > 0
                                ? `rgba(6, 182, 212, ${0.1 + intensity * 0.8})`
                                : 'rgba(148, 163, 184, 0.05)',
                            }}
                            title={`${country} — ${mt}: ${formatCurrency(sales)}`}
                          >
                            {sales > 0 ? `$${(sales / 1e6).toFixed(0)}M` : '—'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Surprise Callouts */}
      {surprises.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {surprises.map(s => (
            <div key={s.country} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[10px]">
              <span className="text-amber-400 font-medium">{s.country}:</span>
              <span className="text-slate-300"> #1 is {s.actual}, not {s.expected}</span>
            </div>
          ))}
        </div>
      )}

      {/* Country Detail Bar Chart */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono">Top Menu Types in</p>
          <select
            value={activeCountry ?? ''}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1 text-sm"
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={countryBarData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
            <YAxis type="category" dataKey="menuType" tick={axisStyle} tickLine={false} axisLine={false} width={100} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Sales']} cursor={false} />
            <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
              {countryBarData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/components/AnalyticsPanel/tabs/MenuTypesTab.tsx
git commit -m "feat(menu-types): redesign with heatmap matrix, summary cards, and surprise callouts"
```

---

### Task 7: Franchisees Tab — API Update

**Files:**
- Modify: `src/app/api/analytics/franchisee-months/route.ts`

**Step 1: Update API to return ALL months per franchisee (remove top-3 filter) and add monthly aggregates**

```typescript
// src/app/api/analytics/franchisee-months/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface FranchiseeMonthsRow {
  COUNTRY: string
  YEAR: number
  FRANCHISEE_NAME: string
  MONTH_LABEL: string
  MONTHLY_SALES: number
  MONTH_RANK: number
}

interface MonthlyAggRow {
  MONTH_NUM: number
  MONTH_NAME: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
}

export async function GET() {
  try {
    const [franchiseeRows, monthlyRows] = await Promise.all([
      executeQuery<FranchiseeMonthsRow>(`
        SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
          TO_CHAR(ORDER_TS_DATE, 'YYYY-MM') AS MONTH_LABEL,
          SUM(PRICE) AS MONTHLY_SALES,
          RANK() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME ORDER BY SUM(PRICE) DESC) AS MONTH_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE FRANCHISE_FLAG = 1
        GROUP BY 1, 2, 3, 4
        ORDER BY COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_LABEL
      `),
      executeQuery<MonthlyAggRow>(`
        SELECT MONTH(ORDER_TS_DATE) AS MONTH_NUM,
          MONTHNAME(ORDER_TS_DATE) AS MONTH_NAME,
          SUM(PRICE) AS TOTAL_SALES,
          COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE FRANCHISE_FLAG = 1
        GROUP BY 1, 2
        ORDER BY 1
      `),
    ])

    const data = franchiseeRows.map(row => ({
      country: row.COUNTRY,
      year: row.YEAR,
      franchisee: row.FRANCHISEE_NAME,
      monthLabel: row.MONTH_LABEL,
      monthlySales: row.MONTHLY_SALES,
      monthRank: row.MONTH_RANK,
    }))

    const monthlyAgg = monthlyRows.map(row => ({
      monthNum: row.MONTH_NUM,
      monthName: row.MONTH_NAME,
      totalSales: row.TOTAL_SALES,
      totalOrders: row.TOTAL_ORDERS,
    }))

    return NextResponse.json({ data, monthlyAgg })
  } catch (error) {
    console.error('Failed to fetch franchisee months:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/analytics/franchisee-months/route.ts
git commit -m "feat(franchisees): return all months and monthly aggregates"
```

---

### Task 8: Franchisees Tab — Redesign Component

**Files:**
- Modify: `src/components/AnalyticsPanel/tabs/FranchiseeTab.tsx` (full rewrite)

**Step 1: Rewrite FranchiseeTab with summary cards, seasonal bar chart, ranked table with sparklines, and heatmap**

```tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
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
} from 'recharts'

interface MonthlyAgg {
  monthNum: number
  monthName: string
  totalSales: number
  totalOrders: number
}

const MONTH_ABBREV = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function FranchiseeTab() {
  const franchiseeData = useGlobeStore((s) => s.franchiseeData)
  const setFranchiseeData = useGlobeStore((s) => s.setFranchiseeData)

  const [monthlyAgg, setMonthlyAgg] = useState<MonthlyAgg[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch data (custom because we need both data and monthlyAgg)
  useEffect(() => {
    if (franchiseeData !== null && monthlyAgg !== null) return
    setLoading(true)
    fetch('/api/analytics/franchisee-months')
      .then(r => r.json())
      .then(res => {
        if (res.data) setFranchiseeData(res.data)
        if (res.monthlyAgg) setMonthlyAgg(res.monthlyAgg)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = franchiseeData

  const countries = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map(r => r.country))].sort()
  }, [data])

  const years = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map(r => r.year))].sort((a, b) => a - b)
  }, [data])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeCountry = selectedCountry ?? countries[0] ?? null
  const activeYear = selectedYear ?? years[0] ?? null

  // Summary cards from monthlyAgg
  const summaryCards = useMemo(() => {
    if (!monthlyAgg || monthlyAgg.length === 0) return null
    const sorted = [...monthlyAgg].sort((a, b) => b.totalSales - a.totalSales)
    const peak = sorted[0]
    const slowest = sorted[sorted.length - 1]
    // Strong season: consecutive months in top half
    const topHalf = new Set(sorted.slice(0, 6).map(m => m.monthNum))
    let strongStart = -1, strongEnd = -1, bestRun = 0
    for (let i = 5; i <= 8; i++) { // May-Aug check
      if (topHalf.has(i)) {
        if (strongStart === -1) strongStart = i
        strongEnd = i
      }
    }
    return {
      peakMonth: peak ? MONTH_ABBREV[peak.monthNum - 1] : null,
      peakSales: peak?.totalSales ?? 0,
      slowestMonth: slowest ? MONTH_ABBREV[slowest.monthNum - 1] : null,
      strongSeason: strongStart > 0 ? `${MONTH_ABBREV[strongStart - 1]}-${MONTH_ABBREV[strongEnd - 1]}` : null,
    }
  }, [monthlyAgg])

  // Filtered franchisee data
  const filtered = useMemo(() => {
    if (!data || !activeCountry || !activeYear) return []
    return data.filter(r => r.country === activeCountry && r.year === activeYear)
  }, [data, activeCountry, activeYear])

  // Franchisee table: ranked by total sales with sparkline data
  const franchiseeTable = useMemo(() => {
    const grouped = new Map<string, FranchiseeMonthRow[]>()
    for (const row of filtered) {
      if (!grouped.has(row.franchisee)) grouped.set(row.franchisee, [])
      grouped.get(row.franchisee)!.push(row)
    }
    return [...grouped.entries()]
      .map(([name, rows]) => {
        const total = rows.reduce((sum, r) => sum + r.monthlySales, 0)
        // Monthly values for sparkline (sorted by month)
        const monthly = rows.sort((a, b) => a.monthLabel.localeCompare(b.monthLabel)).map(r => r.monthlySales)
        return { name, total, monthly, peakMonth: rows.sort((a, b) => b.monthlySales - a.monthlySales)[0]?.monthLabel }
      })
      .sort((a, b) => b.total - a.total)
  }, [filtered])

  // Heatmap: franchisees x months
  const heatmapMonths = useMemo(() => {
    if (!filtered.length) return []
    const months = [...new Set(filtered.map(r => r.monthLabel))].sort()
    return months
  }, [filtered])

  const heatmapMax = useMemo(() => {
    return Math.max(...filtered.map(r => r.monthlySales), 1)
  }, [filtered])

  if (loading || !data) {
    return <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...</div>
  }

  const selectClass = 'bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50'

  return (
    <div className="space-y-5">
      <TabInsight tab="franchisees" />

      {/* Summary Cards */}
      {summaryCards && (
        <div className="flex gap-4">
          {summaryCards.peakMonth && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Peak Month</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.peakMonth}</p>
              <p className="text-[10px] text-slate-400">{formatCurrency(summaryCards.peakSales)}</p>
            </div>
          )}
          {summaryCards.strongSeason && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Strong Season</p>
              <p className="text-sm font-semibold text-cyan-400">{summaryCards.strongSeason}</p>
              <p className="text-[10px] text-slate-400">Consistently high</p>
            </div>
          )}
          {summaryCards.slowestMonth && (
            <div className="bg-white/5 rounded-lg px-4 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">Slowest Month</p>
              <p className="text-sm font-semibold text-amber-400">{summaryCards.slowestMonth}</p>
              <p className="text-[10px] text-slate-400">Plan support here</p>
            </div>
          )}
        </div>
      )}

      {/* Seasonal Bar Chart — Monthly Revenue */}
      {monthlyAgg && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-1">Seasonal Pattern (All Franchisees)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyAgg} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="monthName" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`} tick={axisStyle} tickLine={false} axisLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
              <Bar dataKey="totalSales" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select className={selectClass} value={activeCountry ?? ''} onChange={(e) => setSelectedCountry(e.target.value)}>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={activeYear ?? ''} onChange={(e) => setSelectedYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Top Franchisees Table with Sparklines */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-2">Franchisee Rankings</p>
        <div className="max-h-[200px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-[9px] uppercase font-mono">
                <th className="text-left py-1 pr-2">#</th>
                <th className="text-left py-1">Franchisee</th>
                <th className="text-right py-1 px-2">Total</th>
                <th className="text-center py-1 px-2">Trend</th>
                <th className="text-right py-1">Peak</th>
              </tr>
            </thead>
            <tbody>
              {franchiseeTable.slice(0, 15).map((f, i) => {
                const maxVal = Math.max(...f.monthly, 1)
                return (
                  <tr key={f.name} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 text-slate-500">{i + 1}</td>
                    <td className="py-1.5 text-slate-300 whitespace-nowrap">{f.name}</td>
                    <td className="py-1.5 px-2 text-right text-white font-medium">{formatCurrency(f.total)}</td>
                    <td className="py-1.5 px-2">
                      {/* Mini sparkline */}
                      <svg viewBox={`0 0 ${f.monthly.length * 6} 16`} className="h-3 w-16 mx-auto">
                        {f.monthly.map((val, j) => (
                          <rect
                            key={j}
                            x={j * 6}
                            y={16 - (val / maxVal) * 14}
                            width="4"
                            height={(val / maxVal) * 14}
                            fill={COLORS.primary}
                            opacity={0.7}
                            rx="1"
                          />
                        ))}
                      </svg>
                    </td>
                    <td className="py-1.5 text-right text-slate-400">{f.peakMonth}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Months Heatmap */}
      {franchiseeTable.length > 0 && heatmapMonths.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono mb-2">Franchisee x Month Heatmap</p>
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
            <table className="text-[8px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 pr-2 pb-1 sticky left-0 top-0 bg-slate-900/95 z-10">Franchisee</th>
                  {heatmapMonths.map(m => (
                    <th key={m} className="text-center text-slate-500 px-0.5 pb-1 sticky top-0 bg-slate-900/95">
                      {m.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {franchiseeTable.slice(0, 15).map(f => {
                  const fData = filtered.filter(r => r.franchisee === f.name)
                  const monthMap = new Map(fData.map(r => [r.monthLabel, r.monthlySales]))
                  return (
                    <tr key={f.name}>
                      <td className="text-slate-400 pr-2 py-0.5 whitespace-nowrap sticky left-0 bg-slate-900/95">{f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}</td>
                      {heatmapMonths.map(m => {
                        const sales = monthMap.get(m) ?? 0
                        const intensity = sales / heatmapMax
                        return (
                          <td key={m} className="px-0.5 py-0.5">
                            <div
                              className="rounded-sm w-6 h-4"
                              style={{
                                backgroundColor: sales > 0
                                  ? `rgba(6, 182, 212, ${0.1 + intensity * 0.8})`
                                  : 'rgba(148, 163, 184, 0.05)',
                              }}
                              title={`${f.name} — ${m}: ${formatCurrency(sales)}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/components/AnalyticsPanel/tabs/FranchiseeTab.tsx
git commit -m "feat(franchisees): redesign with seasonal chart, ranked table, sparklines, and heatmap"
```

---

### Task 9: Final Verification and Push

**Step 1: Run the full build**

```bash
cd /Users/jordan/cortex_code_takehome/cortex-globe && npm run build
```

Expected: Build succeeds with no errors

**Step 2: Visually test each tab in the browser**

Open `http://localhost:3000` and check:
- Distribution tab: summary cards, revenue donut, scatter plot, efficiency bars
- Top Brands tab: country dropdown, summary cards, grouped bars, slope chart
- Menu Types tab: summary cards, heatmap, surprise callouts, country bar chart
- Franchisees tab: summary cards, seasonal bars, ranked table, heatmap

**Step 3: Push to GitHub**

```bash
git push origin master
```
