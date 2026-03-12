'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGlobeStore } from '@/lib/store'
import { CITIES } from '@/lib/cityData'
import { CityCard } from '@/components/CityCard/CityCard'
import { AnalyticsPanel } from '@/components/AnalyticsPanel/AnalyticsPanel'
import { GlobalKPIBar } from '@/components/GlobalKPIBar'
import { useOrderFeed } from '@/hooks/useOrderFeed'
import { OrderToast } from '@/components/Globe/OrderToast'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  const setCities = useGlobeStore((s) => s.setCities)
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const selectedCountry = useGlobeStore((s) => s.selectedCountry)
  const setDataLoading = useGlobeStore((s) => s.setDataLoading)
  const setCityKPI = useGlobeStore((s) => s.setCityKPI)
  const setMonthlyTrend = useGlobeStore((s) => s.setMonthlyTrend)
  const setTopItems = useGlobeStore((s) => s.setTopItems)
  const setNarrative = useGlobeStore((s) => s.setNarrative)
  const setNarrativeLoading = useGlobeStore((s) => s.setNarrativeLoading)

  useOrderFeed()

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

    setCityKPI(null)
    setMonthlyTrend([])
    setTopItems([])
    setDataLoading(true)
    setNarrative('')
    setNarrativeLoading(false)

    fetch(`/api/city?name=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry || '')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.kpi) setCityKPI(data.kpi)
        if (data.trend) setMonthlyTrend(data.trend)
        if (data.topItems) setTopItems(data.topItems)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [selectedCity, selectedCountry])

  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
      <CityCard />

      {/* Top-left badge */}
      <div className="fixed top-6 left-6 z-20 glass rounded-xl px-4 py-2.5">
        <h1 className="text-base font-semibold text-white">Tastybytes Global</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Global food truck analytics, powered by Snowflake Cortex</p>
      </div>

      <AnalyticsPanel />
      <GlobalKPIBar />
      <OrderToast />
    </main>
  )
}
