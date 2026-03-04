'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { X, Globe, ShoppingCart, TrendingUp } from 'lucide-react'

export function SummaryPanel() {
  const summaryOpen = useGlobeStore((s) => s.summaryOpen)
  const setSummaryOpen = useGlobeStore((s) => s.setSummaryOpen)
  const cities = useGlobeStore((s) => s.cities)

  const stats = useMemo(() => {
    const totalRevenue = cities.reduce((sum, c) => sum + (c.totalSales || 0), 0)
    const totalOrders = cities.reduce((sum, c) => sum + (c.totalOrders || 0), 0)
    const sorted = [...cities].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    return { totalRevenue, totalOrders, topCities: sorted.slice(0, 10) }
  }, [cities])

  const maxCitySales = stats.topCities[0]?.totalSales || 1

  return (
    <AnimatePresence>
      {summaryOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-[400px] z-30 glass border-l border-white/10 overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Portfolio Summary</h2>
              <button onClick={() => setSummaryOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider text-slate-400">Total Revenue</span>
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider text-slate-400">Total Orders</span>
                </div>
                <p className="text-xl font-bold text-white">{formatNumber(stats.totalOrders)}</p>
              </div>
            </div>

            {/* Global Stats */}
            <div className="flex items-center gap-4 mb-6 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{cities.length} cities</span>
              </div>
              <span>15 countries</span>
              <span>2021-2022</span>
            </div>

            {/* Top 10 Cities */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white mb-3">Top 10 Cities by Revenue</h3>
              <div className="space-y-2">
                {stats.topCities.map((city, i) => (
                  <div key={`${city.city}-${city.country}`} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white">{city.city}</span>
                        <span className="text-xs text-slate-400">{formatCurrency(city.totalSales || 0)}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
                          style={{ width: `${((city.totalSales || 0) / maxCitySales) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
