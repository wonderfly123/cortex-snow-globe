'use client'

import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { Sparkline } from './Sparkline'
import { X, DollarSign, ShoppingCart, TrendingUp, Truck } from 'lucide-react'

export function CityCard() {
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const cityKPI = useGlobeStore((s) => s.cityKPI)
  const monthlyTrend = useGlobeStore((s) => s.monthlyTrend)
  const topItems = useGlobeStore((s) => s.topItems)
  const narrative = useGlobeStore((s) => s.narrative)
  const narrativeLoading = useGlobeStore((s) => s.narrativeLoading)
  const dataLoading = useGlobeStore((s) => s.dataLoading)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)

  if (!selectedCity) return null

  const handleClose = () => {
    selectCity(null)
    setCameraTarget(null)
  }

  return (
    <div className="fixed top-1/2 right-8 -translate-y-1/2 z-20 w-[320px] max-h-[80vh] overflow-y-auto glass rounded-2xl p-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{selectedCity}</h2>
          {cityKPI && (
            <p className="text-xs text-slate-400">{cityKPI.country}</p>
          )}
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cityKPI ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <KPICard icon={<DollarSign className="w-3.5 h-3.5" />} label="Revenue" value={formatCurrency(cityKPI.totalSales)} />
            <KPICard icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Orders" value={formatNumber(cityKPI.totalOrders)} />
            <KPICard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg Order" value={formatCurrency(cityKPI.avgOrderValue)} />
            <KPICard icon={<Truck className="w-3.5 h-3.5" />} label="Trucks" value={String(cityKPI.activeTrucks)} />
          </div>

          {/* Sparkline */}
          {monthlyTrend.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-1">Monthly Sales Trend</p>
              <Sparkline data={monthlyTrend} />
            </div>
          )}

          {/* Top Items */}
          {topItems.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Top Items</p>
              <div className="space-y-1.5">
                {topItems.slice(0, 3).map((item) => (
                  <div key={item.rank} className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400 font-mono w-4">#{item.rank}</span>
                    <span className="text-xs text-white truncate flex-1">{item.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Narrative */}
          <div className="border-t border-white/10 pt-3">
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
        </>
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
