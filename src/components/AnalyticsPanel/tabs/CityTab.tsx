'use client'

import { useMemo } from 'react'
import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { Sparkline } from '@/components/CityCard/Sparkline'
import { X, DollarSign, ShoppingCart, TrendingUp, Truck } from 'lucide-react'

export default function CityTab() {
  const cities = useGlobeStore((s) => s.cities)
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const cityKPI = useGlobeStore((s) => s.cityKPI)
  const monthlyTrend = useGlobeStore((s) => s.monthlyTrend)
  const topItems = useGlobeStore((s) => s.topItems)
  const narrative = useGlobeStore((s) => s.narrative)
  const narrativeLoading = useGlobeStore((s) => s.narrativeLoading)
  const dataLoading = useGlobeStore((s) => s.dataLoading)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => (b.totalSales ?? 0) - (a.totalSales ?? 0)),
    [cities]
  )

  const handleSelectCity = (city: typeof cities[0]) => {
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }

  const handleDeselect = () => {
    selectCity(null)
    setCameraTarget(null)
  }

  // No city selected — show the city list
  if (!selectedCity) {
    return (
      <div>
        <p className="text-xs text-slate-400 mb-3">Select a city to view details</p>
        <div className="grid grid-cols-3 gap-2">
          {sortedCities.map((city) => (
            <button
              key={`${city.city}-${city.country}`}
              onClick={() => handleSelectCity(city)}
              className="flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2.5 transition text-left"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{city.city}</p>
                <p className="text-[10px] text-slate-500">{city.country}</p>
              </div>
              {city.totalSales != null && (
                <span className="text-xs text-cyan-400 font-mono shrink-0">
                  {formatCurrency(city.totalSales)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // City selected — show detail view
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{selectedCity}</h2>
          {cityKPI && (
            <p className="text-xs text-slate-400">{cityKPI.country}</p>
          )}
        </div>
        <button onClick={handleDeselect} className="p-1 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center gap-2 h-[200px] text-cyan-300 text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" /></svg>Loading...
        </div>
      ) : cityKPI ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1: KPIs + Sparkline */}
          <div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <KPICard icon={<DollarSign className="w-3.5 h-3.5" />} label="Revenue" value={formatCurrency(cityKPI.totalSales)} />
              <KPICard icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Orders" value={formatNumber(cityKPI.totalOrders)} />
              <KPICard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg Order" value={formatCurrency(cityKPI.avgOrderValue)} />
              <KPICard icon={<Truck className="w-3.5 h-3.5" />} label="Trucks" value={String(cityKPI.activeTrucks)} />
            </div>
            {monthlyTrend.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Monthly Sales Trend</p>
                <Sparkline data={monthlyTrend} />
              </div>
            )}
          </div>

          {/* Column 2: Top Items */}
          {topItems.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Top Items</p>
              <div className="space-y-1.5">
                {topItems.slice(0, 5).map((item) => (
                  <div key={item.rank} className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400 font-mono w-4">#{item.rank}</span>
                    <span className="text-xs text-white truncate flex-1">{item.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column 3: AI Insight */}
          <div>
            <p className="text-xs text-slate-400 mb-1">AI Insight</p>
            {narrativeLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Generating insight...
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{narrative}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
