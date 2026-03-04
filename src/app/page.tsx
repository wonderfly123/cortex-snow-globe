'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGlobeStore } from '@/lib/store'
import { CITIES } from '@/lib/cityData'
import { CityCard } from '@/components/CityCard/CityCard'

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
    </main>
  )
}
