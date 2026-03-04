'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGlobeStore } from '@/lib/store'
import { CITIES } from '@/lib/cityData'
import { CityCard } from '@/components/CityCard/CityCard'
import { SummaryPanel } from '@/components/SummaryPanel/SummaryPanel'
import { BarChart3 } from 'lucide-react'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  const setCities = useGlobeStore((s) => s.setCities)
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const selectedCountry = useGlobeStore((s) => s.selectedCountry)
  const setDataLoading = useGlobeStore((s) => s.setDataLoading)
  const summaryOpen = useGlobeStore((s) => s.summaryOpen)
  const setSummaryOpen = useGlobeStore((s) => s.setSummaryOpen)
  const setCityKPI = useGlobeStore((s) => s.setCityKPI)
  const setMonthlyTrend = useGlobeStore((s) => s.setMonthlyTrend)
  const setTopItems = useGlobeStore((s) => s.setTopItems)
  const setNarrative = useGlobeStore((s) => s.setNarrative)
  const setNarrativeLoading = useGlobeStore((s) => s.setNarrativeLoading)

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch('/api/cities')
        const data = await res.json()
        if (data.cities) setCities(data.cities)
      } catch {
        setCities(CITIES.map((c) => ({
          city: c.city,
          country: c.country,
          latitude: c.latitude,
          longitude: c.longitude,
          totalSales: c.totalSales,
          totalOrders: c.totalOrders,
        })))
      }
    }
    fetchCities()
  }, [setCities])

  useEffect(() => {
    if (!selectedCity) return

    setDataLoading(true)
    setNarrative('')
    setNarrativeLoading(true)

    fetch(`/api/city?name=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry || '')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.kpi) setCityKPI(data.kpi)
        if (data.trend) setMonthlyTrend(data.trend)
        if (data.topItems) setTopItems(data.topItems)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))

    fetch('/api/cortex/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: selectedCity, country: selectedCountry }),
    })
      .then((r) => r.json())
      .then((data) => setNarrative(data.narrative || ''))
      .catch(() => setNarrative('Unable to generate AI insight.'))
      .finally(() => setNarrativeLoading(false))
  }, [selectedCity, selectedCountry])

  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
      <CityCard />

      {/* Top-left badge */}
      <div className="fixed top-6 left-6 z-20 glass rounded-xl px-4 py-2.5">
        <h1 className="text-sm font-semibold text-white">Cortex Globe</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Snowflake Connected</span>
        </div>
      </div>

      {/* Summary toggle button */}
      <button
        onClick={() => setSummaryOpen(!summaryOpen)}
        className="fixed top-6 right-6 z-20 glass rounded-xl px-4 py-2.5 flex items-center gap-2 hover:bg-white/10 transition"
      >
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-white">Summary</span>
      </button>

      <SummaryPanel />
    </main>
  )
}
