'use client'

import dynamic from 'next/dynamic'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
    </main>
  )
}
