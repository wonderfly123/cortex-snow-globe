'use client'

import { useMemo, useState } from 'react'
import { useGlobeStore, type FranchiseeMonthRow } from '@/lib/store'
import { useAnalyticsData } from '../useAnalyticsData'
import { COLORS } from '../ChartTheme'
import { formatCurrency } from '@/lib/cityData'
import { TabInsight } from '../TabInsight'

export default function FranchiseeTab() {
  const franchiseeData = useGlobeStore((s) => s.franchiseeData)
  const setFranchiseeData = useGlobeStore((s) => s.setFranchiseeData)

  const { data, loading } = useAnalyticsData<FranchiseeMonthRow>(
    'franchisee-months',
    franchiseeData,
    setFranchiseeData,
  )

  // Extract unique sorted countries and years
  const countries = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map((r) => r.country))].sort()
  }, [data])

  const years = useMemo(() => {
    if (!data) return []
    return [...new Set(data.map((r) => r.year))].sort((a, b) => a - b)
  }, [data])

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // Resolve effective selections (default to first available)
  const activeCountry = selectedCountry ?? countries[0] ?? null
  const activeYear = selectedYear ?? years[0] ?? null

  // Filter and group by franchisee
  const franchiseeCards = useMemo(() => {
    if (!data || !activeCountry || !activeYear) return []

    const filtered = data.filter(
      (r) => r.country === activeCountry && r.year === activeYear,
    )

    // Group by franchisee
    const grouped = new Map<string, FranchiseeMonthRow[]>()
    for (const row of filtered) {
      const existing = grouped.get(row.franchisee)
      if (existing) {
        existing.push(row)
      } else {
        grouped.set(row.franchisee, [row])
      }
    }

    // For each franchisee, take top 3 months by sales
    return [...grouped.entries()]
      .map(([name, rows]) => ({
        name,
        topMonths: rows
          .sort((a, b) => b.monthlySales - a.monthlySales)
          .slice(0, 3),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data, activeCountry, activeYear])

  if (loading || !data) {
    return <p className="text-sm text-slate-400">Loading franchisee data...</p>
  }

  const selectClass =
    'bg-slate-800/80 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/50'

  return (
    <div className="space-y-4">
      <TabInsight tab="franchisees" />

      {/* Selectors */}
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

      {/* Franchisee cards — scrollable */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {franchiseeCards.length === 0 ? (
          <p className="text-sm text-slate-400">
            No franchisee data for this selection.
          </p>
        ) : (
          franchiseeCards.map((card) => (
            <div key={card.name} className="bg-white/5 rounded-xl p-3">
              <h4
                className="text-sm font-semibold mb-2"
                style={{ color: COLORS.primary }}
              >
                {card.name}
              </h4>
              <ul className="space-y-1">
                {card.topMonths.map((m, i) => (
                  <li
                    key={m.monthLabel}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-400">
                      <span
                        className="inline-block w-4 text-center mr-1.5 font-medium"
                        style={{ color: COLORS.secondary }}
                      >
                        {i + 1}
                      </span>
                      {m.monthLabel}
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(m.monthlySales)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
