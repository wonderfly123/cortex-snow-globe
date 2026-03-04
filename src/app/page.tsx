'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGlobeStore } from '@/lib/store'
import { CITIES } from '@/lib/cityData'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  const setCities = useGlobeStore((s) => s.setCities)

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

  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
    </main>
  )
}
