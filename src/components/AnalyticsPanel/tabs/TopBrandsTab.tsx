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
  Legend,
} from 'recharts'
import { useGlobeStore, type TopBrandRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS, tooltipStyle, axisStyle } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

const COUNTRIES = [
  'Australia',
  'Brazil',
  'Canada',
  'Egypt',
  'England',
  'France',
  'Germany',
  'India',
  'Japan',
  'Poland',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'United States',
]

const PALETTE = [
  '#06b6d4',
  '#00eeff',
  '#a78bfa',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#60a5fa',
  '#facc15',
  '#fb923c',
  '#c084fc',
]

export default function TopBrandsTab() {
  const topBrandsData = useGlobeStore((s) => s.topBrandsData)
  const setTopBrandsData = useGlobeStore((s) => s.setTopBrandsData)

  const { data: overallData, loading } = useAnalyticsData<TopBrandRow>(
    'top-brands',
    topBrandsData,
    setTopBrandsData,
  )

  const analyticsTimeframe = useGlobeStore((s) => s.analyticsTimeframe)
  const [selectedCountry, setSelectedCountry] = useState('All Countries')
  const [countryData, setCountryData] = useState<TopBrandRow[] | null>(null)
  const [countryLoading, setCountryLoading] = useState(false)

  // Fetch country-specific data when country changes
  useEffect(() => {
    if (selectedCountry === 'All Countries') {
      setCountryData(null)
      return
    }

    let cancelled = false
    setCountryLoading(true)

    const params = new URLSearchParams({ country: selectedCountry })
    if (analyticsTimeframe !== null) params.set('days', String(analyticsTimeframe))
    fetch(`/api/analytics/top-brands?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setCountryData(json.data ?? json)
      })
      .catch(() => {
        if (!cancelled) setCountryData([])
      })
      .finally(() => {
        if (!cancelled) setCountryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCountry])

  const data = selectedCountry === 'All Countries' ? overallData : countryData
  const isLoading = selectedCountry === 'All Countries' ? loading : countryLoading

  const years = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map((r) => r.year))).sort()
  }, [data])

  const hasTwoYears = years.length >= 2

  // Grouped bar chart data: [{ brand, "2021": sales, "2022": sales }, ...]
  const groupedBarData = useMemo(() => {
    if (!data || years.length === 0) return []
    const brandMap: Record<string, Record<string, number>> = {}
    for (const row of data) {
      if (!brandMap[row.brand]) brandMap[row.brand] = {}
      brandMap[row.brand][String(row.year)] = row.totalSales
    }
    const latestYear = String(years[years.length - 1])
    return Object.entries(brandMap)
      .map(([brand, salesByYear]) => ({ brand, ...salesByYear }) as Record<string, string | number>)
      .sort(
        (a, b) =>
          ((b[latestYear] as number) || 0) -
          ((a[latestYear] as number) || 0),
      )
  }, [data, years])

  // Summary card computations
  const fastestRiser = useMemo(() => {
    if (!data || !hasTwoYears) return null
    const [y1, y2] = [years[0], years[1]]
    const salesByBrand: Record<string, Record<number, number>> = {}
    for (const row of data) {
      if (!salesByBrand[row.brand]) salesByBrand[row.brand] = {}
      salesByBrand[row.brand][row.year] = row.totalSales
    }
    let best: { brand: string; increase: number; pct: number } | null = null
    for (const [brand, s] of Object.entries(salesByBrand)) {
      if (s[y1] != null && s[y2] != null && s[y1] > 0) {
        const increase = s[y2] - s[y1]
        const pct = Math.round((increase / s[y1]) * 100)
        if (!best || increase > best.increase) {
          best = { brand, increase, pct }
        }
      }
    }
    return best
  }, [data, years, hasTwoYears])

  const mostConsistent = useMemo(() => {
    if (!data || !hasTwoYears) return null
    const [y1, y2] = [years[0], years[1]]
    const rankByBrand: Record<string, Record<number, number>> = {}
    for (const row of data) {
      if (!rankByBrand[row.brand]) rankByBrand[row.brand] = {}
      rankByBrand[row.brand][row.year] = row.brandRank
    }
    // Brand appearing in top ranks both years — pick the one with best combined rank
    let best: { brand: string; combined: number } | null = null
    for (const [brand, r] of Object.entries(rankByBrand)) {
      if (r[y1] != null && r[y2] != null) {
        const combined = r[y1] + r[y2]
        if (!best || combined < best.combined) {
          best = { brand, combined }
        }
      }
    }
    return best ? { brand: best.brand } : null
  }, [data, years, hasTwoYears])

  // Slope/bump chart data
  const slopeData = useMemo(() => {
    if (!data || !hasTwoYears) return []
    const [y1, y2] = [years[0], years[1]]
    const rankByBrand: Record<string, Record<number, number>> = {}
    for (const row of data) {
      if (!rankByBrand[row.brand]) rankByBrand[row.brand] = {}
      rankByBrand[row.brand][row.year] = row.brandRank
    }
    return Object.entries(rankByBrand)
      .filter(([, r]) => r[y1] != null && r[y2] != null)
      .map(([brand, r]) => ({ brand, rank1: r[y1], rank2: r[y2] }))
      .sort((a, b) => a.rank1 - b.rank1)
  }, [data, years, hasTwoYears])

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <CountryDropdown value={selectedCountry} onChange={setSelectedCountry} />
        <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TabInsight tab="top-brands" />

      {/* Country Dropdown */}
      <CountryDropdown value={selectedCountry} onChange={setSelectedCountry} />

      {/* Summary Cards */}
      {hasTwoYears && (fastestRiser || mostConsistent) && (
        <div className="flex gap-3">
          {fastestRiser && (
            <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
                Fastest Riser
              </div>
              <div className="text-sm font-semibold text-cyan-400">
                {fastestRiser.brand}{' '}
                <span className="text-xs font-normal">
                  +{fastestRiser.pct}% YoY
                </span>
              </div>
            </div>
          )}
          {mostConsistent && (
            <div className="flex-1 bg-white/5 rounded-lg px-4 py-2.5">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono mb-0.5">
                Most Consistent
              </div>
              <div className="text-sm font-semibold text-cyan-400">
                {mostConsistent.brand}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grouped Bar Chart */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 mb-2">
          Revenue by Brand
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            layout="vertical"
            data={groupedBarData}
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
              formatter={(value: number | undefined) =>
                formatCurrency(value ?? 0)
              }
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            />
            {years.map((year, i) => (
              <Bar
                key={year}
                dataKey={String(year)}
                name={String(year)}
                fill={i === 0 ? COLORS.primary : COLORS.secondary}
                radius={[0, 4, 4, 0]}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 11, color: COLORS.text }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Slope / Bump Chart */}
      {hasTwoYears && slopeData.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            Rank Change — {years[0]} vs {years[1]}
          </h3>
          <SlopeChart
            data={slopeData}
            year1={years[0]}
            year2={years[1]}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Country Dropdown ─── */
function CountryDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
    >
      <option value="All Countries">All Countries</option>
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

/* ─── Custom Slope / Bump Chart (SVG) ─── */
function SlopeChart({
  data,
  year1,
  year2,
}: {
  data: { brand: string; rank1: number; rank2: number }[]
  year1: number
  year2: number
}) {
  const maxRank = Math.max(...data.map((d) => Math.max(d.rank1, d.rank2)))
  const padTop = 20
  const padBot = 10
  const chartH = 140
  const usableH = chartH - padTop - padBot

  const yForRank = (rank: number) =>
    padTop + ((rank - 1) / Math.max(maxRank - 1, 1)) * usableH

  const leftX = 130
  const rightX = 350
  const labelLeftX = 5
  const rankLeftX = 115
  const rankRightX = 360

  return (
    <svg
      viewBox="0 0 400 140"
      className="w-full"
      style={{ maxHeight: 200 }}
    >
      {/* Year labels */}
      <text x={leftX} y={12} fill={COLORS.text} fontSize={10} textAnchor="middle">
        {year1}
      </text>
      <text x={rightX} y={12} fill={COLORS.text} fontSize={10} textAnchor="middle">
        {year2}
      </text>

      {data.map((d, i) => {
        const color = PALETTE[i % PALETTE.length]
        const y1 = yForRank(d.rank1)
        const y2 = yForRank(d.rank2)

        return (
          <g key={d.brand}>
            {/* Connecting line */}
            <line
              x1={leftX}
              y1={y1}
              x2={rightX}
              y2={y2}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.7}
            />
            {/* Left circle */}
            <circle cx={leftX} cy={y1} r={4} fill={color} />
            {/* Right circle */}
            <circle cx={rightX} cy={y2} r={4} fill={color} />
            {/* Brand label (left) */}
            <text
              x={labelLeftX}
              y={y1 + 3.5}
              fill={color}
              fontSize={9}
              fontWeight={600}
            >
              {d.brand}
            </text>
            {/* Rank numbers */}
            <text
              x={rankLeftX}
              y={y1 + 3.5}
              fill={COLORS.text}
              fontSize={8}
              textAnchor="end"
            >
              #{d.rank1}
            </text>
            <text
              x={rankRightX}
              y={y2 + 3.5}
              fill={COLORS.text}
              fontSize={8}
              textAnchor="start"
            >
              #{d.rank2}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
