'use client'

import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { X, DollarSign, ShoppingCart, TrendingUp, Truck } from 'lucide-react'

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
] as const

export function CityCard() {
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const selectedCountry = useGlobeStore((s) => s.selectedCountry)
  const cityKPI = useGlobeStore((s) => s.cityKPI)
  const topItems = useGlobeStore((s) => s.topItems)
  const narrative = useGlobeStore((s) => s.narrative)
  const narrativeLoading = useGlobeStore((s) => s.narrativeLoading)
  const setNarrative = useGlobeStore((s) => s.setNarrative)
  const setNarrativeLoading = useGlobeStore((s) => s.setNarrativeLoading)
  const dataLoading = useGlobeStore((s) => s.dataLoading)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)
  const cityTimeframe = useGlobeStore((s) => s.cityTimeframe)
  const setCityTimeframe = useGlobeStore((s) => s.setCityTimeframe)

  function generateNarrative() {
    setNarrativeLoading(true)
    fetch('/api/cortex/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: selectedCity, country: selectedCountry }),
    })
      .then((r) => r.json())
      .then((data) => setNarrative(data.narrative || ''))
      .catch(() => setNarrative('Unable to generate AI insight.'))
      .finally(() => setNarrativeLoading(false))
  }

  if (!selectedCity) return null

  const handleClose = () => {
    selectCity(null)
    setCameraTarget(null)
  }

  return (
    <div className="fixed top-1/2 left-8 -translate-y-1/2 z-20 w-[320px] max-h-[80vh] overflow-y-auto glass rounded-2xl p-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{selectedCity}</h2>
          {selectedCountry && (
            <p className="text-xs text-slate-400">{selectedCountry}</p>
          )}
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Timeframe selector */}
      <div className="flex gap-1 mb-4">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setCityTimeframe(tf.days)}
            className={`flex-1 px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              cityTimeframe === tf.days
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {tf.label}
          </button>
        ))}
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
            {narrativeLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Generating insight...
              </div>
            ) : narrative ? (
              <>
                <p className="text-xs text-slate-400 mb-1">AI Insight</p>
                <p className="text-xs text-slate-300 leading-relaxed">{narrative}</p>
              </>
            ) : (
              <button
                onClick={generateNarrative}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-xs text-cyan-400 font-mono cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Generate AI Insight
              </button>
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
