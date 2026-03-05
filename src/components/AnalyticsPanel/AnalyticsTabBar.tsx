'use client'

import { useGlobeStore, type AnalyticsTab } from '@/lib/store'
import {
  TrendingUp,
  Award,
  UtensilsCrossed,
  Users,
  PieChart,
  Clock,
} from 'lucide-react'

const tabs: { id: AnalyticsTab; icon: typeof TrendingUp; label: string }[] = [
  { id: 'sales-trend', icon: TrendingUp, label: 'Sales Trend' },
  { id: 'top-brands', icon: Award, label: 'Top Brands' },
  { id: 'menu-types', icon: UtensilsCrossed, label: 'Menu Types' },
  { id: 'franchisees', icon: Users, label: 'Franchisees' },
  { id: 'distribution', icon: PieChart, label: 'Distribution' },
  { id: 'patterns', icon: Clock, label: 'Patterns' },
]

export function AnalyticsTabBar() {
  const analyticsTab = useGlobeStore((s) => s.analyticsTab)
  const setAnalyticsTab = useGlobeStore((s) => s.setAnalyticsTab)

  return (
    <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-hide">
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = analyticsTab === id
        return (
          <button
            key={id}
            onClick={() => setAnalyticsTab(id)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0
              ${active ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
